"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AccountLinks } from "@/components/account-links";

type Metric = "biggest-win" | "balance";
type Window = "daily" | "weekly" | "all-time";
type Entry = { rank: number; playerId: string; username: string; score: number };

const API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL ?? "http://localhost:4000";

export default function LeaderboardsPage() {
  const [metric, setMetric] = useState<Metric>("biggest-win");
  const [selectedWindow, setSelectedWindow] = useState<Window>("daily");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/v1/leaderboards/${metric}/${selectedWindow}?limit=25`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? `Leaderboard request failed (${response.status})`);
      }
      const result = await response.json() as { entries: Entry[] };
      setEntries(result.entries);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [metric, selectedWindow]);

  useEffect(() => {
    const initialLoad = globalThis.setTimeout(() => void loadLeaderboard(), 0);
    const timer = globalThis.setInterval(() => void loadLeaderboard(), 30_000);
    const socket: Socket = io(API_URL, { transports: ["websocket", "polling"] });
    const subscription = { metric, window: selectedWindow };
    socket.on("connect", () => socket.emit("leaderboard:subscribe", subscription));
    socket.on("leaderboard:update", () => void loadLeaderboard());
    socket.on("connect_error", (socketError) => {
      console.error("Leaderboard live connection failed", socketError.message);
    });

    return () => {
      globalThis.clearTimeout(initialLoad);
      globalThis.clearInterval(timer);
      socket.emit("leaderboard:unsubscribe", subscription);
      socket.disconnect();
    };
  }, [loadLeaderboard, metric, selectedWindow]);

  const activeWindows: Window[] = metric === "balance"
    ? ["all-time"]
    : ["daily", "weekly", "all-time"];

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <Link href="/" className="text-sm text-[#67d8c6] hover:underline">← Back to games</Link>
            <h1 className="mt-3 text-3xl font-black text-[#fff7e5] sm:text-4xl">Leaderboards</h1>
            <p className="mt-1 text-sm text-white/55">Live standings from the games room</p>
          </div>
          <AccountLinks />
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/85 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
            {([
              ["biggest-win", "Biggest win"],
              ["balance", "Highest balance"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMetric(value);
                  if (value === "balance") setSelectedWindow("all-time");
                }}
                aria-pressed={metric === value}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${metric === value ? "bg-[#67d8c6] text-[#07151a]" : "bg-white/5 text-white/65 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 px-4 pt-4">
            {activeWindows.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedWindow(value)}
                aria-pressed={selectedWindow === value}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${selectedWindow === value ? "bg-white/15 text-white" : "text-white/45 hover:text-white/80"}`}
              >
                {value === "all-time" ? "All time" : value}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {error ? (
              <div role="alert" className="rounded-lg border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
                {error}. Check that the leaderboard API and Redis are running.
              </div>
            ) : loading ? (
              <p className="py-12 text-center text-sm text-white/55">Loading standings…</p>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg font-bold text-white/80">No scores submitted yet</p>
                <p className="mt-1 text-sm text-white/50">Standings appear when the game server records a result.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/40">
                      <th scope="col" className="px-3 py-3 font-semibold">Rank</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Player</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">
                        {metric === "balance" ? "Balance" : "Win"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.playerId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025]">
                        <td className="px-3 py-4 font-mono font-bold text-[#f3cc70]">
                          {String(entry.rank).padStart(2, "0")}
                        </td>
                        <td className="px-3 py-4 font-semibold text-white/90">{entry.username}</td>
                        <td className="px-3 py-4 text-right font-mono font-bold tabular-nums text-[#67d8c6]">
                          {entry.score.toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-white/35">Live updates · amounts shown in credits</p>
          </div>
        </section>
      </div>
    </main>
  );
}
