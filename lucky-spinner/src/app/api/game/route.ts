import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getGameActor, setGuestCookie, type GameActor } from "@/server/game-actor";
import {
  advanceBlackjack,
  resolvePrizeWheel,
  resolveRoulette,
  resolveSlots,
  startBlackjack,
  type BlackjackState,
} from "@/server/game-engine";
import { getSupabaseAdmin } from "@/server/supabase-admin";

class GameApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function response(
  body: unknown,
  actor: GameActor | null,
  status = 200,
): NextResponse {
  const result = NextResponse.json(body, { status });
  if (actor) setGuestCookie(result, actor.newGuestCookie);
  return result;
}

function actorParams(actor: GameActor) {
  return {
    p_user_id: actor.userId,
    p_guest_session_id: actor.guestSessionId,
  };
}

async function getActiveBlackjack(actor: GameActor) {
  let query = getSupabaseAdmin()
    .from("game_sessions")
    .select("id,version,wager,public_state")
    .eq("status", "active");
  query = actor.userId
    ? query.eq("player_id", actor.userId)
    : query.eq("guest_session_id", actor.guestSessionId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load active blackjack game: ${error.message}`);
  return data;
}

export async function GET() {
  let actor: GameActor | null = null;
  try {
    actor = await getGameActor();
    const activeBlackjack = await getActiveBlackjack(actor);
    return response({
      balance: actor.balance,
      balanceVersion: actor.balanceVersion,
      authenticated: Boolean(actor.userId),
      activeBlackjack,
    }, actor);
  } catch (error) {
    console.error("Could not load game session", error);
    return response({ error: "Could not load your game session. Please try again." }, actor, 503);
  }
}

async function parseRequest(request: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) throw new GameApiError(413, "Game request is too large");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new GameApiError(400, "Request body must be valid JSON");
  }
  if (!isRecord(body)) throw new GameApiError(400, "Request body must be a JSON object");
  return body;
}

export async function POST(request: NextRequest) {
  let actor: GameActor | null = null;
  try {
    const body = await parseRequest(request);
    actor = await getGameActor();
    const admin = getSupabaseAdmin();

    if (body.game === "blackjack") {
      if (!validUuid(body.operationId)) {
        throw new GameApiError(400, "operationId must be a UUID");
      }

      if (body.action === "start") {
        const round = startBlackjack(body.wager);
        const gameId = randomUUID();
        const { data, error } = await admin.rpc("start_blackjack_round", {
          ...actorParams(actor),
          p_game_id: gameId,
          p_operation_id: body.operationId,
          p_wager: round.state ? Number(body.wager) : 0,
          p_state: round.state,
          p_public_state: round.result,
          p_payout: round.payout,
          p_complete: round.complete,
        });
        if (error) {
          if (error.message.includes("Insufficient credits")) {
            throw new GameApiError(409, "Not enough credits for that bet");
          }
          if (error.message.includes("active")) {
            throw new GameApiError(409, "Finish your current blackjack round first");
          }
          throw new Error(`Could not start blackjack: ${error.message}`);
        }
        return response(data, actor);
      }

      if ((body.action === "hit" || body.action === "stand") && validUuid(body.gameId)) {
        const admin = getSupabaseAdmin();
        let query = admin
          .from("game_sessions")
          .select("state,wager,version,status,last_operation_id,last_response")
          .eq("id", body.gameId);
        query = actor.userId
          ? query.eq("player_id", actor.userId)
          : query.eq("guest_session_id", actor.guestSessionId);
        const { data: session, error: sessionError } = await query.maybeSingle();
        if (sessionError) throw new Error(`Could not load blackjack round: ${sessionError.message}`);
        if (!session) throw new GameApiError(404, "Blackjack round not found");
        if (session.last_operation_id === body.operationId) {
          return response(session.last_response, actor);
        }
        if (session.status !== "active") throw new GameApiError(409, "Blackjack round is already complete");

        const next = advanceBlackjack(
          session.state as BlackjackState,
          body.action,
          session.wager,
        );
        const { data, error } = await admin.rpc("advance_blackjack_round", {
          ...actorParams(actor),
          p_game_id: body.gameId,
          p_expected_version: session.version,
          p_operation_id: body.operationId,
          p_state: next.state,
          p_public_state: next.result,
          p_payout: next.payout,
          p_complete: next.complete,
        });
        if (error) {
          if (error.message.includes("changed")) {
            throw new GameApiError(409, "This blackjack round changed; reload the game");
          }
          throw new Error(`Could not update blackjack: ${error.message}`);
        }
        return response(data, actor);
      }

      throw new GameApiError(400, "Choose a blackjack action");
    }

    if (!validUuid(body.operationId)) {
      throw new GameApiError(400, "operationId must be a UUID");
    }

    const outcome = body.game === "slots"
      ? resolveSlots()
      : body.game === "roulette"
        ? resolveRoulette(body.bets)
        : body.game === "prize-wheel"
          ? resolvePrizeWheel(body.wager)
          : null;
    if (!outcome) throw new GameApiError(400, "Choose a supported game");

    const { data, error } = await admin.rpc("apply_game_round", {
      ...actorParams(actor),
      p_operation_id: body.operationId,
      p_game: body.game,
      p_wager: outcome.wager,
      p_payout: outcome.payout,
      p_result: outcome.result,
    });
    if (error) {
      if (error.message.includes("Insufficient credits")) {
        throw new GameApiError(409, "Not enough credits for that wager");
      }
      if (error.message.includes("expired")) {
        throw new GameApiError(401, "Your guest session expired. Reload to start a new one.");
      }
      throw new Error(`Could not record game result: ${error.message}`);
    }
    return response(data, actor);
  } catch (error) {
    if (error instanceof GameApiError) return response({ error: error.message }, actor, error.status);
    if (error instanceof Error && (
      error.message.includes("Choose a valid") ||
      error.message.includes("Place between") ||
      error.message.includes("Invalid roulette") ||
      error.message.includes("wager exceeds")
    )) {
      return response({ error: error.message }, actor, 400);
    }
    console.error("Game action failed", error);
    return response({ error: "Game action could not be completed. Please try again." }, actor, 503);
  }
}
