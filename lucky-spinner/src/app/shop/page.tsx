"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, Check, Crown, LockKeyhole, Sparkles, Zap } from "lucide-react";
import { AccountLinks } from "@/components/account-links";
import { BOOST_TIERS, type ActiveBoost, type BoostTierId } from "@/lib/boosts";

interface InventoryItem {
  id: string;
  tier: BoostTierId;
  status: "available" | "active" | "exhausted";
  remaining_plays: number;
  purchased_at: string;
}

interface ShopState {
  authenticated: boolean;
  balance: number;
  balanceVersion: number;
  activeBoost: ActiveBoost | null;
  inventory: InventoryItem[];
}

const icons = {
  basic: Sparkles,
  plus: Zap,
  premium: Crown,
} satisfies Record<BoostTierId, typeof Sparkles>;

const formatCredits = (amount: number) => amount.toLocaleString("en-US");

export default function ShopPage() {
  const [shop, setShop] = useState<ShopState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const purchaseOperationIds = useRef(new Map<BoostTierId, string>());

  const fetchShop = useCallback(async () => {
    const response = await fetch("/api/shop", { cache: "no-store" });
    const data = await response.json() as ShopState & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load the shop");
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    void fetchShop()
      .then((data) => {
        if (!active) return;
        setShop(data);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the shop");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchShop]);

  const performAction = async (
    key: string,
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<boolean> => {
    setBusyAction(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/shop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Shop action failed");
      setNotice(successMessage);
      try {
        const nextShop = await fetchShop();
        setShop(nextShop);
      } catch {
        setError("The action completed, but your shop details could not refresh. Reload the page to see the latest state.");
      }
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Shop action failed");
      return false;
    } finally {
      setBusyAction("");
    }
  };

  const purchase = (tier: (typeof BOOST_TIERS)[number]) => {
    const operationId = purchaseOperationIds.current.get(tier.id) ?? crypto.randomUUID();
    purchaseOperationIds.current.set(tier.id, operationId);
    void performAction(
      `purchase-${tier.id}`,
      { action: "purchase", tier: tier.id, operationId },
      `${tier.name} boost added to your inventory.`,
    ).then((purchased) => {
      if (purchased) purchaseOperationIds.current.delete(tier.id);
    });
  };

  const activate = (item: InventoryItem) => {
    const tier = BOOST_TIERS.find((entry) => entry.id === item.tier);
    void performAction(
      `activate-${item.id}`,
      { action: "activate", itemId: item.id },
      `${tier?.name ?? "Boost"} activated for 25 eligible plays.`,
    );
  };

  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-black tracking-[0.12em] text-[#fff7e5]">
              SLOTS <span className="text-[#67d8c6]">MANIA</span>
            </Link>
            <span className="hidden h-5 w-px bg-white/15 sm:block" />
            <span className="hidden text-sm font-semibold text-white/55 sm:block">The boost shop</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
            >
              All games
            </Link>
            <AccountLinks />
          </div>
        </header>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-[#67d8c6]/15 bg-[#111827]/85 px-6 py-9 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#67d8c6]/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-[#f3cc70]/[0.06] blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#67d8c6]/20 bg-[#67d8c6]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#8ee7d8]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Your next lucky streak starts here
              </p>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-[#fff7e5] sm:text-6xl">
                A little more <span className="text-[#67d8c6]">luck.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Pick up a boost, keep it in your inventory, and activate it when you&apos;re ready.
                Every boost powers 25 spins on slots and the prize wheel.
              </p>
            </div>
            <div className="rounded-2xl border border-[#f3cc70]/20 bg-black/20 px-5 py-4 lg:min-w-52">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Your balance</p>
              <p className="mt-1 font-mono text-3xl font-black tabular-nums text-[#f3cc70]">
                {loading ? "…" : shop ? formatCredits(shop.balance) : "—"}
              </p>
              <p className="text-xs text-white/45">play credits</p>
            </div>
          </div>
          {shop?.activeBoost && (
            <div className="relative mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-[#f3cc70]/25 bg-[#f3cc70]/[0.07] px-4 py-3">
              <Sparkles aria-hidden="true" className="h-5 w-5 text-[#f3cc70]" />
              <p className="flex-1 text-sm font-semibold text-[#fff1c8]">
                {BOOST_TIERS.find((tier) => tier.id === shop.activeBoost?.tier)?.name} boost is active
              </p>
              <span className="rounded-full bg-[#f3cc70]/10 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-[#f3cc70]">
                {shop.activeBoost.remainingPlays} plays remaining
              </span>
              <span className="text-xs text-white/55">Finish it before activating another.</span>
            </div>
          )}
        </section>

        {shop && !shop.authenticated && !loading && (
          <section className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#8da9ff]/20 bg-[#8da9ff]/[0.06] p-5">
            <LockKeyhole aria-hidden="true" className="h-5 w-5 text-[#aebfff]" />
            <p className="flex-1 text-sm leading-6 text-white/75">
              Sign in to buy and activate boosts. Your inventory is saved to your account.
            </p>
            <Link
              href="/login?next=%2Fshop"
              className="rounded-lg bg-[#8da9ff] px-4 py-2.5 text-sm font-bold text-[#101629] transition hover:brightness-110"
            >
              Sign in to shop
            </Link>
          </section>
        )}

        {error && <p role="alert" className="mt-6 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-xl border border-[#67d8c6]/20 bg-[#67d8c6]/[0.07] px-4 py-3 text-sm text-[#a2f0e2]">{notice}</p>}

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#67d8c6]">Choose your edge</p>
              <h2 className="mt-1 text-2xl font-black text-[#fff7e5] sm:text-3xl">Boosts for every kind of spin</h2>
            </div>
            <p className="text-xs text-white/45">One active boost at a time · 25 completed plays</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {BOOST_TIERS.map((tier) => {
              const Icon = icons[tier.id];
              const popular = tier.id === "plus";
              return (
                <article
                  key={tier.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border bg-[#111827]/80 p-5 transition duration-200 hover:-translate-y-1 hover:bg-[#151e30] sm:p-6 ${popular ? "border-[#8da9ff]/45 shadow-[0_16px_50px_rgba(95,124,224,0.1)]" : "border-white/10"}`}
                  style={{ boxShadow: `inset 0 1px 0 ${tier.accent}18` }}
                >
                  {popular && (
                    <span className="absolute right-4 top-4 rounded-full border border-[#8da9ff]/30 bg-[#8da9ff]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#b8c7ff]">
                      Fan favorite
                    </span>
                  )}
                  <div
                    className="grid h-12 w-12 place-items-center rounded-xl border"
                    style={{ color: tier.accent, backgroundColor: `${tier.accent}12`, borderColor: `${tier.accent}35` }}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: tier.accent }}>
                    {tier.name} boost
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">{tier.description}</h3>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="font-mono text-4xl font-black tabular-nums text-[#fff7e5]">{formatCredits(tier.price)}</span>
                    <span className="mb-1.5 text-xs font-semibold text-white/45">credits</span>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/55">Profitable-spin chance</span>
                      <strong style={{ color: tier.accent }}>+{tier.winRateIncrease} points</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/55">Maximum bet while active</span>
                      <strong className="font-mono tabular-nums text-white">{tier.maxBet} credits</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/55">Boost duration</span>
                      <strong className="text-white">25 spins</strong>
                    </div>
                  </div>

                  <div className="mt-auto pt-6">
                    {shop?.authenticated ? (
                      <button
                        type="button"
                        onClick={() => purchase(tier)}
                        disabled={loading || Boolean(busyAction) || (shop?.balance ?? 0) < tier.price}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-[#0b111b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ backgroundColor: tier.accent }}
                      >
                        {busyAction === `purchase-${tier.id}` ? "Adding to inventory…" : (shop?.balance ?? 0) < tier.price ? "Not enough credits" : "Add to inventory"}
                        <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    ) : shop ? (
                      <Link
                        href="/login?next=%2Fshop"
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-[#0b111b] transition hover:brightness-110"
                        style={{ backgroundColor: tier.accent }}
                      >
                        Sign in to buy <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/40"
                      >
                        {loading ? "Loading shop…" : "Shop unavailable"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/40">
            Boosts add the listed percentage-point increase to the chance of a profitable result on slots and the prize wheel. They don&apos;t guarantee a win. Blackjack and roulette are not affected.
          </p>
        </section>

        <section className="mt-12 pb-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#67d8c6]">Saved for your next session</p>
              <h2 className="mt-1 text-2xl font-black text-[#fff7e5]">Your inventory</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/55">
              {shop?.inventory.length ?? 0} boosts
            </span>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#111827]/60 p-8 text-center text-sm text-white/45">
              Loading your shop…
            </div>
          ) : shop?.authenticated && shop.inventory.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {shop.inventory.map((item) => {
                const tier = BOOST_TIERS.find((entry) => entry.id === item.tier);
                if (!tier) return null;
                const active = item.status === "active";
                const exhausted = item.status === "exhausted";
                return (
                  <article
                    key={item.id}
                    className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 sm:p-5 ${active ? "border-[#f3cc70]/35 bg-[#f3cc70]/[0.05]" : "border-white/10 bg-[#111827]/60"}`}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${tier.accent}12`, color: tier.accent }}>
                      {active ? <Sparkles aria-hidden="true" className="h-5 w-5" /> : exhausted ? <Check aria-hidden="true" className="h-5 w-5" /> : <Zap aria-hidden="true" className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">{tier.name} boost</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${active ? "bg-[#f3cc70]/10 text-[#f3cc70]" : exhausted ? "bg-white/5 text-white/35" : "bg-[#67d8c6]/10 text-[#8ee7d8]"}`}>
                          {active ? "Active" : exhausted ? "Used" : "Ready"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {active
                          ? `${shop.activeBoost?.remainingPlays ?? item.remaining_plays} of 25 plays left`
                          : exhausted
                            ? "All 25 plays used"
                            : `+${tier.winRateIncrease} points · max ${tier.maxBet} credits per bet`}
                      </p>
                    </div>
                    {item.status === "available" && (
                      <button
                        type="button"
                        onClick={() => activate(item)}
                        disabled={Boolean(shop.activeBoost) || Boolean(busyAction)}
                        className="min-h-10 rounded-lg border border-[#67d8c6]/30 bg-[#67d8c6]/10 px-4 py-2 text-xs font-bold text-[#9be9dc] transition hover:bg-[#67d8c6]/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyAction === `activate-${item.id}` ? "Activating…" : shop.activeBoost ? "Finish active boost first" : "Activate"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : shop?.authenticated ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#111827]/35 px-5 py-8 text-center">
              <Sparkles aria-hidden="true" className="mx-auto h-6 w-6 text-[#67d8c6]/70" />
              <p className="mt-3 font-semibold text-white/75">Your inventory is waiting for its first boost.</p>
              <p className="mt-1 text-xs text-white/40">Choose a tier above to get started.</p>
            </div>
          ) : shop ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#111827]/35 px-5 py-8 text-center">
              <LockKeyhole aria-hidden="true" className="mx-auto h-6 w-6 text-[#aebfff]" />
              <p className="mt-3 font-semibold text-white/75">Your boosts will live here once you sign in.</p>
              <p className="mt-1 text-xs text-white/40">Browse the tiers above, then sign in to purchase.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#111827]/35 px-5 py-8 text-center text-sm text-white/45">
              Your shop inventory could not be loaded.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
