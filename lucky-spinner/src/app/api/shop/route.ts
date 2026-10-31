import { NextResponse, type NextRequest } from "next/server";
import { BOOST_TIERS, getBoostTier } from "@/lib/boosts";
import { getActivePlayerBoost } from "@/server/boosts";
import { getGameActor, setGuestCookie, type GameActor } from "@/server/game-actor";
import { getSupabaseAdmin } from "@/server/supabase-admin";

class ShopApiError extends Error {
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

function apiResponse(body: unknown, actor: GameActor | null, status = 200) {
  const result = NextResponse.json(body, { status });
  if (actor) setGuestCookie(result, actor.newGuestCookie);
  return result;
}

export async function GET() {
  let actor: GameActor | null = null;
  try {
    actor = await getGameActor();
    const activeBoost = await getActivePlayerBoost(actor.userId);
    let inventory: unknown[] = [];

    if (actor.userId) {
      const { data, error } = await getSupabaseAdmin()
        .from("player_boost_inventory")
        .select("id,tier,status,remaining_plays,purchased_at,activated_at,completed_at")
        .eq("player_id", actor.userId)
        .order("purchased_at", { ascending: false });
      if (error) throw new Error(`Could not load boost inventory: ${error.message}`);
      inventory = data;
    }

    return apiResponse({
      authenticated: Boolean(actor.userId),
      balance: actor.balance,
      balanceVersion: actor.balanceVersion,
      tiers: BOOST_TIERS,
      activeBoost,
      inventory,
    }, actor);
  } catch (error) {
    console.error("Could not load shop", error);
    return apiResponse({ error: "Could not load the shop. Please try again." }, actor, 503);
  }
}

async function parseRequest(request: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) throw new ShopApiError(413, "Shop request is too large");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ShopApiError(400, "Request body must be valid JSON");
  }
  if (!isRecord(body)) throw new ShopApiError(400, "Request body must be a JSON object");
  return body;
}

export async function POST(request: NextRequest) {
  let actor: GameActor | null = null;
  try {
    const body = await parseRequest(request);
    actor = await getGameActor();
    if (!actor.userId) {
      throw new ShopApiError(401, "Sign in to purchase or activate boosts");
    }

    const admin = getSupabaseAdmin();
    if (body.action === "purchase") {
      const tier = typeof body.tier === "string" ? getBoostTier(body.tier) : undefined;
      if (!tier || !validUuid(body.operationId)) {
        throw new ShopApiError(400, "Choose a boost tier and provide a valid operation ID");
      }

      const { data, error } = await admin.rpc("purchase_credit_boost", {
        p_user_id: actor.userId,
        p_tier: tier.id,
        p_operation_id: body.operationId,
      });
      if (error) {
        if (error.message.includes("Insufficient credits")) {
          throw new ShopApiError(409, "You do not have enough credits for this boost");
        }
        throw new Error(`Could not purchase boost: ${error.message}`);
      }
      return apiResponse(data, actor);
    }

    if (body.action === "activate") {
      if (!validUuid(body.itemId)) {
        throw new ShopApiError(400, "Choose a valid boost from your inventory");
      }
      const { data, error } = await admin.rpc("activate_credit_boost", {
        p_user_id: actor.userId,
        p_inventory_id: body.itemId,
      });
      if (error) {
        if (error.message.includes("Another boost is already active")) {
          throw new ShopApiError(409, error.message);
        }
        if (error.message.includes("Boost is not available")) {
          throw new ShopApiError(409, error.message);
        }
        throw new Error(`Could not activate boost: ${error.message}`);
      }
      return apiResponse(data, actor);
    }

    throw new ShopApiError(400, "Choose a shop action");
  } catch (error) {
    if (error instanceof ShopApiError) {
      return apiResponse({ error: error.message }, actor, error.status);
    }
    console.error("Shop action failed", error);
    return apiResponse({ error: "Shop action could not be completed. Please try again." }, actor, 503);
  }
}
