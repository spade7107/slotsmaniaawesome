import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ActiveBoost } from "@/lib/boosts";
import { getBoostTier } from "@/lib/boosts";

export function ActiveBoostStatus({ boost }: { boost: ActiveBoost | null }) {
  if (!boost) {
    return (
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 rounded-lg border border-[#67d8c6]/20 bg-[#67d8c6]/5 px-3 py-2 text-xs font-semibold text-[#9be9dc] transition hover:border-[#67d8c6]/50 hover:bg-[#67d8c6]/10"
      >
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        Shop boosts
      </Link>
    );
  }

  const tier = getBoostTier(boost.tier);
  const usedPlays = 25 - boost.remainingPlays;

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f3cc70]/25 bg-[#f3cc70]/[0.06] px-4 py-3"
    >
      <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-[#f3cc70]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[#fff1c8]">
          {tier?.name ?? "Active"} boost · +{boost.winRateIncrease} points · max bet {boost.maxBet}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Boost plays used"
          aria-valuemin={0}
          aria-valuemax={25}
          aria-valuenow={usedPlays}
        >
          <div
            className="h-full rounded-full bg-[#f3cc70] transition-[width]"
            style={{ width: `${usedPlays / 25 * 100}%` }}
          />
        </div>
      </div>
      <span className="whitespace-nowrap font-mono text-xs font-bold tabular-nums text-[#fff1c8]">
        {boost.remainingPlays}/25 left
      </span>
      <Link href="/shop" className="text-xs font-semibold text-[#f3cc70] hover:text-white">
        Inventory
      </Link>
    </div>
  );
}
