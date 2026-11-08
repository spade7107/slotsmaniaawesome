"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActiveBoost } from "@/lib/boosts";
import type { ExpandedWildInfo } from "@/components/alchemists-crucible/types/slot";

export interface AlchemistsCrucibleBonusState {
  id: string;
  version: number;
  bet: number;
  spinsRemaining: number;
  totalSpins: number;
  stickyWilds: Record<number, ExpandedWildInfo>;
  accumulatedWin: number;
  status: "active" | "complete";
}

export interface GameActionResponse {
  balance: number;
  balanceVersion: number;
  authenticated?: boolean;
  activeBoost?: ActiveBoost | null;
  activeCrucibleBonus?: AlchemistsCrucibleBonusState | null;
  activeBlackjack?: {
    id: string;
    version: number;
    wager: number;
    public_state: Record<string, unknown>;
  } | null;
  gameId?: string;
  version?: number;
  complete?: boolean;
  result?: Record<string, unknown>;
  netProfit?: number;
  error?: string;
}

function isCrucibleBonusState(value: unknown): value is AlchemistsCrucibleBonusState {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "version" in value && Number.isInteger(value.version) &&
    "bet" in value && Number.isInteger(value.bet) &&
    "spinsRemaining" in value && Number.isInteger(value.spinsRemaining) &&
    "totalSpins" in value && Number.isInteger(value.totalSpins) &&
    "stickyWilds" in value && typeof value.stickyWilds === "object" && value.stickyWilds !== null &&
    "accumulatedWin" in value && Number.isSafeInteger(value.accumulatedWin) &&
    "status" in value && (value.status === "active" || value.status === "complete");
}

export function useGameSession() {
  const [balance, setBalance] = useState(0);
  const [balanceVersion, setBalanceVersion] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeBoost, setActiveBoost] = useState<ActiveBoost | null>(null);
  const [activeCrucibleBonus, setActiveCrucibleBonus] =
    useState<AlchemistsCrucibleBonusState | null>(null);
  const [activeBlackjack, setActiveBlackjack] =
    useState<GameActionResponse["activeBlackjack"]>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/game", { cache: "no-store" });
    const data = await response.json() as GameActionResponse;
    if (!response.ok) throw new Error(data.error ?? "Could not load game session");
    setBalance(data.balance);
    setBalanceVersion(data.balanceVersion);
    setAuthenticated(Boolean(data.authenticated));
    setActiveBoost(data.activeBoost ?? null);
    setActiveCrucibleBonus(data.activeCrucibleBonus ?? null);
    setActiveBlackjack(data.activeBlackjack ?? null);
    setError("");
    setReady(true);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/game", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as GameActionResponse;
        if (!response.ok) throw new Error(data.error ?? "Could not load game session");
        if (!active) return;
        setBalance(data.balance);
        setBalanceVersion(data.balanceVersion);
        setAuthenticated(Boolean(data.authenticated));
        setActiveBoost(data.activeBoost ?? null);
        setActiveCrucibleBonus(data.activeCrucibleBonus ?? null);
        setActiveBlackjack(data.activeBlackjack ?? null);
        setReady(true);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Could not load game session");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const act = useCallback(async (body: Record<string, unknown>) => {
    setError("");
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json() as GameActionResponse;
    if (!response.ok) {
      const message = data.error ?? "Game action failed";
      setError(message);
      throw new Error(message);
    }
    if (typeof data.balance === "number") setBalance(data.balance);
    if (typeof data.balanceVersion === "number") setBalanceVersion(data.balanceVersion);
    if (Object.prototype.hasOwnProperty.call(data, "activeBoost")) {
      setActiveBoost(data.activeBoost ?? null);
    }
    if (body.game === "alchemists-crucible") {
      const bonus = data.result?.bonusState;
      setActiveCrucibleBonus(
        isCrucibleBonusState(bonus) && bonus.status === "active"
          ? bonus
          : null,
      );
    }
    if (body.game === "blackjack") {
      setActiveBlackjack(data.complete ? null : {
        id: data.gameId ?? "",
        version: data.version ?? 0,
        wager: Number(body.wager ?? activeBlackjack?.wager ?? 0),
        public_state: data.result ?? {},
      });
    }
    return data;
  }, [activeBlackjack]);

  return {
    balance,
    balanceVersion,
    authenticated,
    activeBoost,
    activeCrucibleBonus,
    activeBlackjack,
    ready,
    error,
    refresh,
    act,
  };
}
