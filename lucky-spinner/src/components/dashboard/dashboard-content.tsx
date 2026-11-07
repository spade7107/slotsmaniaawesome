"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accessibility,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  Gamepad2,
  Gift,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { ActiveBoostStatus } from "@/components/active-boost-status";
import { DashboardModal } from "@/components/dashboard/modal";
import { GameCatalog } from "@/components/dashboard/game-catalog";
import { PromoCarousel, type PromoSlide } from "@/components/dashboard/promo-carousel";
import { QuestList } from "@/components/dashboard/quest-list";
import { useResponsiblePlay } from "@/components/dashboard/responsible-play-provider";
import type { DashboardQuest, DashboardResponse } from "@/components/dashboard/types";
import { getSupabaseClient } from "@/lib/supabase";
import { playUiSound } from "@/lib/ui-sounds";

const PROMOTIONS: PromoSlide[] = [];

function formatCoins(value: number): string {
  return value.toLocaleString("en-US");
}

function formatSession(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

function formatCountdown(value: string | undefined): string {
  if (!value) return "—";
  const seconds = Math.max(0, Math.floor((Date.parse(value) - Date.now()) / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function ModalHeading({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#67d8c6]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-[#fff7e5]">{title}</h2>
      </div>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-white/65 transition hover:bg-white/10"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d8c6]"
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function DashboardContent() {
  const router = useRouter();
  const responsiblePlay = useResponsiblePlay();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [questsDrawerOpen, setQuestsDrawerOpen] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const settingsLoaded = useRef(false);
  const authenticated = data?.authenticated === true;
  const dashboard = data?.dashboard ?? null;

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = await response.json() as DashboardResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not load your dashboard");
      }
      if (!Number.isSafeInteger(result.balance) || result.balance < 0) {
        throw new Error("The balance response was invalid");
      }
      setData(result);
      setLoadError("");
      setActionError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load your dashboard";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const refresh = () => void loadDashboard();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", refresh);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const resetAt = dashboard?.dailyBonus.resetsAt;
    if (!authenticated || !resetAt) return;
    const delay = Math.max(0, Date.parse(resetAt) - Date.now() + 1_000);
    const timer = window.setTimeout(() => void loadDashboard(), delay);
    return () => window.clearTimeout(timer);
  }, [authenticated, dashboard?.dailyBonus.resetsAt, loadDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let savedSound = false;
      let savedMotion = false;
      try {
        savedSound = window.localStorage.getItem("slotsmania:audio-enabled") === "true";
        savedMotion = window.localStorage.getItem("slotsmania:reduce-motion") === "true";
      } catch (error) {
        console.error("Could not read dashboard settings", error);
      }
      settingsLoaded.current = true;
      setSoundEnabled(savedSound);
      setReduceMotion(savedMotion);
      document.documentElement.dataset.reduceMotion = savedMotion ? "true" : "false";
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsLoaded.current) return;
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
    try {
      window.localStorage.setItem("slotsmania:audio-enabled", String(soundEnabled));
      window.localStorage.setItem("slotsmania:reduce-motion", String(reduceMotion));
    } catch (error) {
      console.error("Could not save dashboard settings", error);
    }
  }, [reduceMotion, soundEnabled]);

  const username = dashboard?.profile.username ?? (authenticated ? "Player" : "Guest");
  const initial = username.slice(0, 1).toLocaleUpperCase();
  const quests = dashboard?.quests ?? [];

  const playClick = useCallback(() => {
    playUiSound(soundEnabled);
  }, [soundEnabled]);

  const claim = useCallback(async (action: "claim-bonus" | "claim-quest", quest?: DashboardQuest) => {
    setActionError("");
    setActionMessage("");
    setClaimingId(quest?.id ?? "bonus");
    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          ...(quest ? { questId: quest.id } : {}),
        }),
      });
      const result = await response.json() as {
        balance?: number;
        balanceVersion?: number;
        reward?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "The reward could not be claimed");
      }
      const newBalance = result.balance;
      const reward = result.reward;
      if (
        typeof newBalance !== "number" ||
        !Number.isSafeInteger(newBalance) ||
        typeof reward !== "number" ||
        !Number.isSafeInteger(reward)
      ) {
        throw new Error("The reward response was invalid");
      }
      setData((current) => current
        ? {
            ...current,
            balance: newBalance,
            balanceVersion: result.balanceVersion ?? current.balanceVersion,
          }
        : current);
      playUiSound(soundEnabled, "confirm");
      setActionMessage(`You received ${formatCoins(reward)} GC.`);
      await loadDashboard();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The reward could not be claimed");
    } finally {
      setClaimingId(null);
    }
  }, [loadDashboard, soundEnabled]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setActionError("Sign out is unavailable because account services are not configured.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setActionError(`Could not sign out: ${error.message}`);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  const bonusAvailable = dashboard?.dailyBonus.available === true;
  const balanceText = data ? formatCoins(data.balance) : loading ? "…" : "—";
  const questPanel = (
    <div className="space-y-4">
      <QuestList
        quests={authenticated ? quests : []}
        claimingId={claimingId}
        onClaim={(quest) => void claim("claim-quest", quest)}
      />
      {authenticated ? (
        <Link
          href="/leaderboards"
          onClick={playClick}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#67d8c6] hover:text-white"
        >
          <Trophy aria-hidden="true" className="h-4 w-4" />
          View leaderboards
        </Link>
      ) : (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#67d8c6] hover:text-white"
        >
          Sign in to unlock quests
        </Link>
      )}
    </div>
  );

  return (
    <div className="dashboard-root min-h-screen text-white">
      <header className="dashboard-topbar sticky top-0 z-30 border-b border-white/[0.08] bg-[#09111d]/90 px-3 py-3 backdrop-blur-xl sm:px-5 lg:px-7">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-2">
          <Link href="/dashboard#lobby" className="dashboard-brand shrink-0 text-sm font-black tracking-[0.12em] text-[#fff7e5] sm:text-base">
            SLOTS <span className="dashboard-brand-extra text-[#67d8c6]">MANIA</span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => authenticated ? setProfileOpen(true) : router.push("/login")}
              className="flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] p-1.5 pr-2.5 text-left transition hover:border-[#67d8c6]/40 hover:bg-white/[0.07] sm:pr-3"
              aria-label={authenticated ? `Open ${username} profile and stats` : "Sign in"}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#67d8c6,#268a83)] text-sm font-black text-[#07151a]">
                {initial}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-24 truncate text-xs font-bold text-white/90">{username}</span>
                <span className="block text-[10px] font-semibold text-[#67d8c6]">
                  {authenticated && dashboard ? `Lvl ${dashboard.progression.level}` : "Guest"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResponsibleOpen(true)}
              className="dashboard-session-pill flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-bold tabular-nums text-white/75 transition hover:border-[#67d8c6]/40 hover:text-white"
              aria-label={`Session ${formatSession(responsiblePlay.elapsedSeconds)}. Open responsible play reminders`}
            >
              <Clock3 aria-hidden="true" className="h-4 w-4 text-[#67d8c6]" />
              <span className="hidden lg:inline">Session:</span>
              <span>{formatSession(responsiblePlay.elapsedSeconds)}</span>
            </button>

            <div
              className="dashboard-balance-pill flex min-h-11 items-center gap-1.5 rounded-full border border-[#f3cc70]/25 bg-[#f3cc70]/[0.07] px-3 text-sm font-black tabular-nums text-[#f3cc70]"
              aria-label={`${balanceText} Gold Coins`}
            >
              <Coins aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="max-w-[5.5rem] truncate">{balanceText}</span>
              <span className="text-[10px] tracking-wide">GC</span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <span className="hidden sm:inline"><Settings aria-hidden="true" className="h-5 w-5" /></span>
              <span className="sm:hidden"><Menu aria-hidden="true" className="h-5 w-5" /></span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-3 pb-24 pt-4 sm:px-5 lg:px-7">
        {(loadError || actionError || actionMessage) && (
          <div className="mb-4 space-y-2" aria-live="polite">
            {loadError && (
              <p role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                Could not load your balance or dashboard: {loadError}
              </p>
            )}
            {actionError && (
              <p role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {actionError}
              </p>
            )}
            {actionMessage && (
              <p role="status" className="rounded-xl border border-[#67d8c6]/25 bg-[#67d8c6]/[0.07] px-4 py-3 text-sm text-[#b8f5e9]">
                {actionMessage}
              </p>
            )}
          </div>
        )}

        <div className={`dashboard-layout ${rightRailCollapsed ? "dashboard-layout--collapsed" : ""} ${authenticated ? "" : "dashboard-layout--guest"}`}>
          <aside className="dashboard-sidebar" aria-label="Primary navigation">
            <nav className="space-y-1">
              <NavLink href="/dashboard#lobby" label="Lobby" icon={Home} onClick={playClick} />
              <NavLink href="/dashboard#games" label="Games" icon={Gamepad2} onClick={playClick} />
              <button
                type="button"
                onClick={() => {
                  setQuestsDrawerOpen(true);
                  playClick();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Trophy aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                <span>Leaderboards &amp; quests</span>
              </button>
              {authenticated && (
                <>
                  <NavLink href="/shop" label="Store" icon={ShoppingBag} onClick={playClick} />
                  <NavLink href="/shop#inventory" label="Inventory" icon={Package} onClick={playClick} />
                </>
              )}
            </nav>

            <section id="daily-bonus-sidebar" className="dashboard-sidebar-bonus mt-auto rounded-2xl border border-[#f3cc70]/20 bg-[linear-gradient(145deg,rgba(243,204,112,.1),rgba(17,24,39,.75))] p-4">
              <div className="flex items-center gap-2 text-[#f3cc70]">
                <Gift aria-hidden="true" className="h-4 w-4" />
                <h2 className="text-xs font-black uppercase tracking-wider">Daily bonus</h2>
              </div>
              {authenticated ? (
                <>
                  <p className="mt-2 text-xs text-white/55">
                    {bonusAvailable ? "Your Gold Coins are ready." : `Next claim in ${formatCountdown(dashboard?.dailyBonus.resetsAt)} UTC`}
                  </p>
                  <button
                    type="button"
                    disabled={!bonusAvailable || claimingId === "bonus"}
                    onClick={() => void claim("claim-bonus")}
                    className="mt-3 min-h-11 w-full rounded-lg bg-[#f3cc70] px-3 text-xs font-black text-[#17202a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                  >
                    {claimingId === "bonus" ? "Claiming…" : bonusAvailable ? "Claim 100 GC" : "Claimed today"}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">Sign in to unlock the daily bonus.</p>
                  <Link href="/login" className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-[#f3cc70]">
                    Sign in
                  </Link>
                </>
              )}
            </section>
          </aside>

          <main id="lobby" className="dashboard-main min-w-0 scroll-mt-24">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#67d8c6]">
                  {authenticated ? "Welcome back" : "Welcome to Slots Mania"}
                </p>
                <h1 className="mt-1 text-2xl font-black text-[#fff7e5] sm:text-3xl">
                  {authenticated ? username : "Find your next game"}
                </h1>
              </div>
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => setQuestsDrawerOpen(true)}
                  className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/70 transition hover:border-[#67d8c6]/40 hover:text-white xl:hidden"
                >
                  Quick quests
                </button>
                {authenticated && (
                  <button
                    type="button"
                    onClick={() => setRightRailCollapsed((value) => !value)}
                    aria-expanded={!rightRailCollapsed}
                    className="hidden min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/60 transition hover:text-white xl:inline-flex"
                  >
                    {rightRailCollapsed ? <ChevronLeft aria-hidden="true" className="h-4 w-4" /> : <ChevronRight aria-hidden="true" className="h-4 w-4" />}
                    {rightRailCollapsed ? "Show quests" : "Hide quests"}
                  </button>
                )}
              </div>
            </div>

            <PromoCarousel slides={PROMOTIONS} />

            {authenticated && data?.activeBoost && (
              <div className="mb-6">
                <ActiveBoostStatus boost={data.activeBoost} />
              </div>
            )}

            <section
              id="daily-bonus"
              aria-labelledby="daily-bonus-heading"
              className="mb-5 rounded-2xl border border-[#f3cc70]/20 bg-[#f3cc70]/[0.055] p-4 md:hidden"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f3cc70]">Daily reward</p>
                  <h2 id="daily-bonus-heading" className="mt-1 font-bold text-[#fff7e5]">
                    {authenticated ? "Daily bonus" : "Sign in for daily rewards"}
                  </h2>
                </div>
                {authenticated ? (
                  <button
                    type="button"
                    disabled={!bonusAvailable || claimingId === "bonus"}
                    onClick={() => void claim("claim-bonus")}
                    className="min-h-11 shrink-0 rounded-xl bg-[#f3cc70] px-4 text-xs font-black text-[#17202a] disabled:bg-white/10 disabled:text-white/40"
                  >
                    {claimingId === "bonus" ? "Claiming…" : bonusAvailable ? "CLAIM!" : formatCountdown(dashboard?.dailyBonus.resetsAt)}
                  </button>
                ) : (
                  <Link href="/login" className="min-h-11 rounded-xl bg-[#f3cc70] px-4 py-3 text-xs font-black text-[#17202a]">
                    Sign in
                  </Link>
                )}
              </div>
            </section>

            {responsiblePlay.breakSecondsRemaining > 0 && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#67d8c6]/20 bg-[#67d8c6]/[0.06] px-4 py-3 text-sm">
                <p className="text-[#b8f5e9]">
                  Break reminder · {Math.ceil(responsiblePlay.breakSecondsRemaining / 60)} min remaining
                </p>
                <button
                  type="button"
                  onClick={responsiblePlay.dismissBreak}
                  className="min-h-11 px-2 text-xs font-bold text-white/55 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            <GameCatalog
              popularGames={data?.popularGames ?? {}}
              authenticated={authenticated}
              soundEnabled={soundEnabled}
              onSound={playClick}
            />
          </main>

          {authenticated && (
            <aside className="dashboard-utility-rail rounded-2xl border border-white/[0.08] bg-[#0e1725]/70 p-4" aria-label="Quick quests">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#67d8c6]">Daily goals</p>
                  <h2 className="mt-1 text-lg font-black text-[#fff7e5]">Quick quests</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRightRailCollapsed(true)}
                  aria-label="Collapse quick quests"
                  className="grid h-11 w-11 place-items-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              {questPanel}
              <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/35">
                Quests reset at 00:00 UTC. Progress counts completed game rounds.
              </p>
            </aside>
          )}
        </div>
      </div>

      <nav className="dashboard-bottom-nav" aria-label="Mobile navigation">
        <Link href="/dashboard#lobby" onClick={playClick} className="dashboard-bottom-item">
          <Home aria-hidden="true" className="h-5 w-5" />
          <span>Lobby</span>
        </Link>
        <Link href="/dashboard#games" onClick={playClick} className="dashboard-bottom-item">
          <Gamepad2 aria-hidden="true" className="h-5 w-5" />
          <span>Games</span>
        </Link>
        {authenticated ? (
          <button
            type="button"
            onClick={() => {
              document.getElementById("daily-bonus")?.scrollIntoView({ behavior: "smooth", block: "center" });
              playClick();
            }}
            className="dashboard-bottom-item dashboard-bottom-featured"
          >
            <Gift aria-hidden="true" className="h-5 w-5" />
            <span>{bonusAvailable ? "CLAIM!" : formatCountdown(dashboard?.dailyBonus.resetsAt)}</span>
          </button>
        ) : (
          <Link href="/login" className="dashboard-bottom-item dashboard-bottom-featured">
            <Gift aria-hidden="true" className="h-5 w-5" />
            <span>Sign in</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setQuestsDrawerOpen(true);
            playClick();
          }}
          className="dashboard-bottom-item"
        >
          <Trophy aria-hidden="true" className="h-5 w-5" />
          <span>Quests</span>
          {authenticated && quests.filter((quest) => quest.claimable).length > 0 && (
            <span className="dashboard-nav-badge">{quests.filter((quest) => quest.claimable).length}</span>
          )}
        </button>
        {authenticated ? (
          <Link href="/shop" onClick={playClick} className="dashboard-bottom-item">
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            <span>Store</span>
          </Link>
        ) : (
          <Link href="/leaderboards" className="dashboard-bottom-item">
            <Trophy aria-hidden="true" className="h-5 w-5" />
            <span>Leaders</span>
          </Link>
        )}
      </nav>

      <DashboardModal open={questsDrawerOpen} onClose={() => setQuestsDrawerOpen(false)} className="dashboard-utility-dialog">
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#67d8c6]">Daily goals</p>
              <h2 className="mt-1 text-xl font-black text-[#fff7e5]">Quests &amp; leaderboards</h2>
            </div>
            <button
              type="button"
              aria-label="Close quests"
              onClick={() => setQuestsDrawerOpen(false)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-white/65 hover:bg-white/10"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          {questPanel}
        </div>
      </DashboardModal>

      <DashboardModal open={profileOpen} onClose={() => setProfileOpen(false)}>
        <ModalHeading eyebrow="Player profile" title="Profile & stats" onClose={() => setProfileOpen(false)} />
        <div className="space-y-6 p-5 sm:p-7">
          {dashboard ? (
            <>
              <div className="flex items-center gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#67d8c6]/50 bg-[#67d8c6]/10 text-2xl font-black text-[#67d8c6]">
                  {initial}
                </span>
                <div>
                  <p className="text-lg font-black text-white">{username}</p>
                  <p className="text-sm font-bold text-[#67d8c6]">Level {dashboard.progression.level}</p>
                </div>
              </div>
              <section aria-label="XP progress" className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/45">Experience</p>
                    <p className="mt-1 font-mono text-lg font-black tabular-nums text-[#f3cc70]">
                      {formatCoins(dashboard.progression.xp)} XP
                    </p>
                  </div>
                  <p className="text-xs font-semibold tabular-nums text-white/50">
                    {formatCoins(dashboard.progression.xpIntoLevel)} / {formatCoins(dashboard.progression.xpForNextLevel)}
                  </p>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label="Progress to next level"
                  aria-valuemin={0}
                  aria-valuemax={dashboard.progression.xpForNextLevel}
                  aria-valuenow={dashboard.progression.xpIntoLevel}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#67d8c6] to-[#f3cc70]"
                    style={{ width: `${dashboard.progression.xpIntoLevel / dashboard.progression.xpForNextLevel * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/45">
                  Each completed round earns XP based on its GC wager, up to 100 XP per round. Each new level requires more XP than the last.
                </p>
              </section>
              <section aria-labelledby="profile-stats-heading">
                <h3 id="profile-stats-heading" className="text-xs font-black uppercase tracking-wider text-white/45">
                  Lifetime stats
                </h3>
                <dl className="mt-3 grid grid-cols-12 gap-2">
                  <div className="col-span-12 rounded-xl border border-white/10 p-3 sm:col-span-4">
                    <dt className="text-[10px] font-semibold text-white/45">Rounds</dt>
                    <dd className="mt-1 font-mono text-lg font-black tabular-nums text-white">{formatCoins(dashboard.stats.completedRounds)}</dd>
                  </div>
                  <div className="col-span-12 rounded-xl border border-white/10 p-3 sm:col-span-4">
                    <dt className="text-[10px] font-semibold text-white/45">Wagered</dt>
                    <dd className="mt-1 font-mono text-lg font-black tabular-nums text-white">{formatCoins(dashboard.stats.totalWager)} GC</dd>
                  </div>
                  <div className="col-span-12 rounded-xl border border-white/10 p-3 sm:col-span-4">
                    <dt className="text-[10px] font-semibold text-white/45">Net</dt>
                    <dd className={`mt-1 font-mono text-lg font-black tabular-nums ${dashboard.stats.netProfit >= 0 ? "text-[#67d8c6]" : "text-red-300"}`}>
                      {dashboard.stats.netProfit > 0 ? "+" : ""}{formatCoins(dashboard.stats.netProfit)} GC
                    </dd>
                  </div>
                </dl>
              </section>
              <section aria-label="Level perks">
                <h3 className="text-xs font-black uppercase tracking-wider text-white/45">Cosmetic level perks</h3>
                <div className="mt-3 grid grid-cols-12 gap-2">
                  {[
                    { level: 5, title: "Bronze badge" },
                    { level: 10, title: "Silver badge" },
                    { level: 20, title: "Gold badge" },
                  ].map((perk) => (
                    <div key={perk.level} className={`col-span-12 rounded-xl border p-3 sm:col-span-4 ${dashboard.progression.level >= perk.level ? "border-[#f3cc70]/30 bg-[#f3cc70]/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
                      <p className="text-[10px] font-bold text-white/45">Level {perk.level}</p>
                      <p className="mt-1 text-xs font-bold text-[#f3cc70]">{perk.title}</p>
                      <p className="mt-1 text-[10px] text-white/45">{dashboard.progression.level >= perk.level ? "Unlocked" : "Locked"}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-white/35">
                  XP and cosmetic levels are calculated from completed game history. Levels do not change game odds or GC rewards.
                </p>
              </section>
            </>
          ) : (
            <p className="text-sm text-white/60">Player stats are available after signing in.</p>
          )}
        </div>
      </DashboardModal>

      <DashboardModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ModalHeading eyebrow="Preferences" title="Settings" onClose={() => setSettingsOpen(false)} />
        <div className="divide-y divide-white/[0.08] p-5 sm:p-7">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
            <span className="flex items-center gap-3">
              <Volume2 aria-hidden="true" className="h-5 w-5 text-[#67d8c6]" />
              <span>
                <span className="block text-sm font-bold text-white/90">UI sounds</span>
                <span className="block text-xs text-white/45">Subtle dashboard sounds, off by default</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setSoundEnabled(enabled);
                if (enabled) playUiSound(true, "confirm");
              }}
              className="h-5 w-5 accent-[#67d8c6]"
            />
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
            <span className="flex items-center gap-3">
              <Accessibility aria-hidden="true" className="h-5 w-5 text-[#67d8c6]" />
              <span>
                <span className="block text-sm font-bold text-white/90">Reduce motion</span>
                <span className="block text-xs text-white/45">Also respects your device preference</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
              className="h-5 w-5 accent-[#67d8c6]"
            />
          </label>

          <div className="flex items-center justify-between gap-4 py-4">
            <span className="flex items-center gap-3">
              <CircleHelp aria-hidden="true" className="h-5 w-5 text-white/35" />
              <span>
                <span className="block text-sm font-bold text-white/45">Notifications</span>
                <span className="block text-xs text-white/35">Unavailable until notification services are added</span>
              </span>
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Coming later
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <span className="flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-white/35" />
              <span>
                <span className="block text-sm font-bold text-white/45">Terms</span>
                <span className="block text-xs text-white/35">Terms coming soon</span>
              </span>
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Coming soon
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              setResponsibleOpen(true);
            }}
            className="flex min-h-14 w-full items-center gap-3 py-3 text-left"
          >
            <Clock3 aria-hidden="true" className="h-5 w-5 text-[#67d8c6]" />
            <span>
              <span className="block text-sm font-bold text-white/90">Responsible play</span>
              <span className="block text-xs text-white/45">Session timer, reminders, and voluntary breaks</span>
            </span>
            <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 text-white/35" />
          </button>

          {authenticated ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex min-h-14 w-full items-center gap-3 py-3 text-left text-red-200"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
              <span className="text-sm font-bold">Sign out</span>
            </button>
          ) : (
            <Link href="/login" className="flex min-h-14 items-center gap-3 py-3 text-sm font-bold text-[#67d8c6]">
              <LogOut aria-hidden="true" className="h-5 w-5" />
              Sign in
            </Link>
          )}
        </div>
      </DashboardModal>

      <DashboardModal
        open={responsibleOpen}
        onClose={() => {
          setResponsibleOpen(false);
          if (responsiblePlay.reminderOpen) responsiblePlay.dismissReminder();
        }}
      >
        <ModalHeading
          eyebrow="Take a moment"
          title="Responsible play"
          onClose={() => {
            setResponsibleOpen(false);
            if (responsiblePlay.reminderOpen) responsiblePlay.dismissReminder();
          }}
        />
        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-xl border border-[#67d8c6]/20 bg-[#67d8c6]/[0.06] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#67d8c6]">Current session</p>
            <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white">
              {formatSession(responsiblePlay.elapsedSeconds)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/45">
              Time is counted while a dashboard or game page is visible. The timer resets after 30 minutes away.
            </p>
          </div>
          <label className="block text-sm font-bold text-white/80">
            Remind me to check in
            <select
              value={responsiblePlay.reminderMinutes}
              onChange={(event) => responsiblePlay.setReminderMinutes(Number(event.target.value))}
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#111b2b] px-3 text-sm text-white outline-none focus:border-[#67d8c6]/60"
            >
              {[30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>Every {minutes} minutes</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-white/80">
            Voluntary break reminder
            <select
              value={responsiblePlay.breakMinutes}
              onChange={(event) => responsiblePlay.setBreakMinutes(Number(event.target.value))}
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#111b2b] px-3 text-sm text-white outline-none focus:border-[#67d8c6]/60"
            >
              {[5, 15, 30].map((minutes) => (
                <option key={minutes} value={minutes}>{minutes} minute break reminder</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={responsiblePlay.startBreak}
            className="min-h-12 w-full rounded-xl border border-[#67d8c6]/35 bg-[#67d8c6]/10 px-4 text-sm font-bold text-[#b8f5e9] transition hover:bg-[#67d8c6]/15"
          >
            Start a {responsiblePlay.breakMinutes}-minute break reminder
          </button>
          <p className="text-[11px] leading-relaxed text-white/40">
            These are browser-local reminders only. They do not block access to games and are not enforceable play limits or cooling-off controls.
          </p>
        </div>
      </DashboardModal>

      <DashboardModal
        open={responsiblePlay.reminderOpen}
        onClose={responsiblePlay.dismissReminder}
        className="w-[min(92vw,30rem)]"
      >
        <div className="p-6 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f3cc70]/10 text-[#f3cc70]">
            <Clock3 aria-hidden="true" className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-[#fff7e5]">Time for a check-in?</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            You’ve been playing for {formatSession(responsiblePlay.elapsedSeconds)}. Consider taking a break.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                responsiblePlay.startBreak();
                setResponsibleOpen(true);
              }}
              className="min-h-12 flex-1 rounded-xl border border-[#67d8c6]/30 bg-[#67d8c6]/10 px-4 text-sm font-bold text-[#b8f5e9]"
            >
              Start a break reminder
            </button>
            <button
              type="button"
              onClick={responsiblePlay.dismissReminder}
              className="min-h-12 flex-1 rounded-xl bg-[#67d8c6] px-4 text-sm font-black text-[#07151a]"
            >
              Continue
            </button>
          </div>
          <p className="mt-4 text-[10px] text-white/35">This reminder does not block game access.</p>
        </div>
      </DashboardModal>
    </div>
  );
}
