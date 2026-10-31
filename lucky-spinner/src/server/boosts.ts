import { getBoostTier, type ActiveBoost } from "@/lib/boosts";
import { getSupabaseAdmin } from "./supabase-admin";

export async function getActivePlayerBoost(userId: string | null): Promise<ActiveBoost | null> {
  if (!userId) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("player_boost_inventory")
    .select("id,tier,remaining_plays")
    .eq("player_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Could not load active boost: ${error.message}`);
  if (!data) return null;

  const tier = getBoostTier(data.tier);
  if (!tier || !Number.isInteger(data.remaining_plays) || data.remaining_plays < 1) {
    throw new Error("Active boost data is invalid");
  }
  return {
    id: data.id,
    tier: tier.id,
    remainingPlays: data.remaining_plays,
    maxBet: tier.maxBet,
    winRateIncrease: tier.winRateIncrease,
  };
}
