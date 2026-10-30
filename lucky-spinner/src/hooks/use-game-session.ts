"use client";

import { useCallback, useEffect, useState } from "react";

export interface GameActionResponse {
  balance: number;
  balanceVersion: number;
  authenticated?: boolean;
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

export function useGameSession() {
  const [balance, setBalance] = useState(0);
  const [balanceVersion, setBalanceVersion] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
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
    activeBlackjack,
    ready,
    error,
    refresh,
    act,
  };
}
