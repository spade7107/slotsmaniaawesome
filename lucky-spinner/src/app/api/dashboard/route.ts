import { NextResponse, type NextRequest } from "next/server";
import { getActivePlayerBoost } from "@/server/boosts";
import { getGameActor, setGuestCookie, type GameActor } from "@/server/game-actor";
import { getSupabaseAdmin } from "@/server/supabase-admin";

class DashboardApiError extends Error {
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

function apiResponse(body: unknown, actor: GameActor | null, status = 200) {
  const result = NextResponse.json(body, { status });
  if (actor) setGuestCookie(result, actor.newGuestCookie);
  return result;
}

export async function GET() {
  let actor: GameActor | null = null;
  try {
    actor = await getGameActor();
    const admin = getSupabaseAdmin();
    const [activeBoost, popularityResult, summaryResult] = await Promise.all([
      getActivePlayerBoost(actor.userId),
      admin.rpc("get_popular_game_counts"),
      actor.userId
        ? admin.rpc("get_dashboard_summary", { p_user_id: actor.userId })
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (popularityResult.error) {
      throw new Error(`Could not load popular game counts: ${popularityResult.error.message}`);
    }
    if (summaryResult.error) {
      throw new Error(`Could not load player dashboard: ${summaryResult.error.message}`);
    }

    return apiResponse({
      authenticated: Boolean(actor.userId),
      balance: actor.balance,
      balanceVersion: actor.balanceVersion,
      activeBoost,
      popularGames: popularityResult.data ?? {},
      dashboard: summaryResult.data,
    }, actor);
  } catch (error) {
    console.error("Could not load dashboard", error);
    return apiResponse({
      error: "Could not load your dashboard. Please try again.",
    }, actor, 503);
  }
}

async function parseRequest(request: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) {
    throw new DashboardApiError(413, "Dashboard request is too large");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DashboardApiError(400, "Request body must be valid JSON");
  }
  if (!isRecord(body)) {
    throw new DashboardApiError(400, "Request body must be a JSON object");
  }
  return body;
}

export async function POST(request: NextRequest) {
  let actor: GameActor | null = null;
  try {
    const body = await parseRequest(request);
    actor = await getGameActor();
    if (!actor.userId) {
      throw new DashboardApiError(401, "Sign in to claim Gold Coins rewards");
    }

    const admin = getSupabaseAdmin();
    if (body.action === "claim-bonus") {
      const { data, error } = await admin.rpc("claim_daily_bonus", {
        p_user_id: actor.userId,
      });
      if (error) {
        if (error.message.includes("Daily bonus already claimed")) {
          throw new DashboardApiError(409, "You already claimed today’s daily bonus");
        }
        throw new Error(`Could not claim daily bonus: ${error.message}`);
      }
      return apiResponse(data, actor);
    }

    if (body.action === "claim-quest") {
      if (body.questId !== "rounds-3" && body.questId !== "rounds-5") {
        throw new DashboardApiError(400, "Choose a valid daily quest");
      }
      const { data, error } = await admin.rpc("claim_daily_quest", {
        p_user_id: actor.userId,
        p_quest_id: body.questId,
      });
      if (error) {
        if (error.message.includes("Daily quest already claimed")) {
          throw new DashboardApiError(409, "You already claimed this quest reward");
        }
        if (error.message.includes("Daily quest is not complete")) {
          throw new DashboardApiError(409, "Complete the quest before claiming its reward");
        }
        throw new Error(`Could not claim daily quest: ${error.message}`);
      }
      return apiResponse(data, actor);
    }

    throw new DashboardApiError(400, "Choose a dashboard action");
  } catch (error) {
    if (error instanceof DashboardApiError) {
      return apiResponse({ error: error.message }, actor, error.status);
    }
    console.error("Dashboard action failed", error);
    return apiResponse({
      error: "The dashboard action could not be completed. Please try again.",
    }, actor, 503);
  }
}
