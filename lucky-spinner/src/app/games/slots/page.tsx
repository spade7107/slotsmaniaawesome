"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActiveBoostStatus } from "@/components/active-boost-status";
import { createSlotGame, type SlotSceneHandle } from "@/components/slots/slot-scene";
import { useGameSession } from "@/hooks/use-game-session";
import {
  cyberpunkSlotsTheme,
  getSlotSymbol,
  SLOT_COLUMNS,
  SLOT_ROWS,
  type SlotWin,
} from "@/lib/slots";

type SlotResult = {
  grid: string[][];
  wins: SlotWin[];
  payout: number;
  boostApplied: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSlotResult(value: unknown): SlotResult | null {
  if (!isRecord(value) || !Array.isArray(value.grid) || value.grid.length !== SLOT_ROWS) {
    return null;
  }

  const grid: string[][] = [];
  for (const row of value.grid) {
    if (!Array.isArray(row) || row.length !== SLOT_COLUMNS) {
      return null;
    }
    const parsedRow: string[] = [];
    for (const symbol of row) {
      if (typeof symbol !== "string" || !getSlotSymbol(symbol)) return null;
      parsedRow.push(symbol);
    }
    grid.push(parsedRow);
  }

  if (!Array.isArray(value.winningLines) || !Number.isSafeInteger(value.payout) || Number(value.payout) < 0) {
    return null;
  }

  const wins: SlotWin[] = [];
  for (const rawWin of value.winningLines) {
    if (!isRecord(rawWin) || !Array.isArray(rawWin.cells)) return null;
    const { payline, symbol, matchCount, multiplier, payout, cells } = rawWin;
    if (
      !Number.isInteger(payline)
      || Number(payline) < 1
      || Number(payline) > cyberpunkSlotsTheme.paylines.length
      || typeof symbol !== "string"
      || !getSlotSymbol(symbol)
      || !Number.isInteger(matchCount)
      || Number(matchCount) < 3
      || Number(matchCount) > SLOT_COLUMNS
      || !Number.isSafeInteger(multiplier)
      || Number(multiplier) <= 0
      || !Number.isSafeInteger(payout)
      || Number(payout) < 0
      || cells.length !== Number(matchCount)
    ) {
      return null;
    }

    const validatedCells: SlotWin["cells"] = [];
    for (let column = 0; column < cells.length; column += 1) {
      const cell = cells[column];
      if (
        !isRecord(cell)
        || !Number.isInteger(cell.row)
        || Number(cell.row) < 0
        || Number(cell.row) >= SLOT_ROWS
        || cell.column !== column
      ) {
        return null;
      }
      validatedCells.push({ row: Number(cell.row), column });
    }

    wins.push({
      payline: Number(payline),
      symbol,
      matchCount: Number(matchCount),
      multiplier: Number(multiplier),
      payout: Number(payout),
      cells: validatedCells,
    });
  }

  if (wins.reduce((total, win) => total + win.payout, 0) !== Number(value.payout)) return null;

  return {
    grid,
    wins,
    payout: Number(value.payout),
    boostApplied: value.boostApplied === true,
  };
}

function formatCredits(amount: number) {
  return amount.toLocaleString("en-US");
}

export default function SlotsPage() {
  const { balance, ready, error, activeBoost, act } = useGameSession();
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SlotSceneHandle | null>(null);
  const pendingOperationId = useRef<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [betPerLine, setBetPerLine] = useState<number>(1);
  const [activePaylineCount, setActivePaylineCount] = useState<number>(5);
  const [spinning, setSpinning] = useState(false);
  const [retryPendingSpin, setRetryPendingSpin] = useState(false);
  const [status, setStatus] = useState("Choose your bet and active paylines to begin.");

  const totalBet = betPerLine * activePaylineCount;
  const hasInsufficientBalance = ready && balance < totalBet;
  const exceedsBoostLimit = Boolean(activeBoost && totalBet > activeBoost.maxBet);
  const canSpin = ready && sceneReady && !spinning && !hasInsufficientBalance && !exceedsBoostLimit;

  useEffect(() => {
    const parent = stageRef.current;
    if (!parent) return;

    let disposed = false;
    let destroyGame: (() => void) | null = null;
    void createSlotGame(parent, cyberpunkSlotsTheme, (scene) => {
      if (disposed) return;
      sceneRef.current = scene;
      setSceneReady(true);
    }).then((destroy) => {
      if (disposed) destroy();
      else destroyGame = destroy;
    }).catch((mountError: unknown) => {
      const details = mountError instanceof Error ? mountError.message : "Unknown Phaser error.";
      setStatus(`The slot machine could not start: ${details}`);
    });

    return () => {
      disposed = true;
      sceneRef.current = null;
      destroyGame?.();
    };
  }, []);

  const spin = useCallback(async () => {
    if (!canSpin) return;
    setSpinning(true);
    setStatus("Connecting to the reels…");

    const operationId = pendingOperationId.current ?? crypto.randomUUID();
    pendingOperationId.current = operationId;

    let response: Awaited<ReturnType<typeof act>>;
    try {
      response = await act({
        game: "slots",
        operationId,
        betPerLine,
        activePaylineCount,
      });
      pendingOperationId.current = null;
      setRetryPendingSpin(false);
    } catch (spinError) {
      setStatus(spinError instanceof Error ? spinError.message : "Could not complete the spin.");
      setRetryPendingSpin(true);
      setSpinning(false);
      return;
    }

    const result = parseSlotResult(response.result);
    if (!result) {
      setStatus("The server returned an invalid slot result. Your balance has been refreshed.");
      setSpinning(false);
      return;
    }

    setStatus("Reels in motion…");
    try {
      sceneRef.current?.spin(result.grid, result.wins, () => {
        if (result.payout > 0) {
          const winLabel = result.wins.length === 1 ? "payline" : "paylines";
          setStatus(
            `${result.boostApplied ? "BOOSTED WIN!" : "WIN!"} ${formatCredits(result.payout)} GC · `
            + `${result.wins.length} winning ${winLabel}.`,
          );
        } else {
          setStatus("No line wins this time. Try another combination.");
        }
        setSpinning(false);
      });
    } catch (animationError) {
      const details = animationError instanceof Error ? animationError.message : "Unknown animation error.";
      setStatus(`The result was recorded, but the reels could not animate: ${details}`);
      setSpinning(false);
    }
  }, [act, activePaylineCount, betPerLine, canSpin]);

  const selectBet = (value: number) => {
    setBetPerLine(value);
    const nextTotalBet = value * activePaylineCount;
    setStatus(
      activeBoost && nextTotalBet > activeBoost.maxBet
        ? `This boost allows a maximum total bet of ${formatCredits(activeBoost.maxBet)} GC.`
        : balance < nextTotalBet
          ? `Not enough GC. This spin costs ${formatCredits(nextTotalBet)}.`
          : `Ready to spin for ${formatCredits(nextTotalBet)} GC.`,
    );
  };

  const selectLines = (value: number) => {
    setActivePaylineCount(value);
    const nextTotalBet = betPerLine * value;
    setStatus(
      activeBoost && nextTotalBet > activeBoost.maxBet
        ? `This boost allows a maximum total bet of ${formatCredits(activeBoost.maxBet)} GC.`
        : balance < nextTotalBet
          ? `Not enough GC. This spin costs ${formatCredits(nextTotalBet)}.`
          : `Ready to spin for ${formatCredits(nextTotalBet)} GC.`,
    );
  };

  return (
    <main className="min-h-screen px-3 py-5 text-[#eef8ff] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#7771aa]/25 pb-5">
          <div>
            <Link href="/games" className="text-sm font-bold text-[#48f7df] hover:text-[#a7fff5]">
              ← All games
            </Link>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#48f7df]">
              Slots Mania · Cyber district
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#f5f2ff] drop-shadow-[0_0_18px_rgba(255,69,200,0.28)] sm:text-4xl">
              Neon Afterdark
            </h1>
          </div>
          <div className="rounded-xl border border-[#48f7df]/25 bg-[#11152a]/90 px-4 py-3 text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#99a6c1]">
              Play GC
            </span>
            <strong className="mt-0.5 flex items-baseline justify-end gap-2 font-mono text-2xl tabular-nums text-[#fff16b]">
              {ready ? formatCredits(balance) : "…"}
              <small className="text-[10px] tracking-widest text-[#aab4ca]">GC</small>
            </strong>
          </div>
        </header>

        <div className="mb-4">
          <ActiveBoostStatus boost={activeBoost} />
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-[#ff829b]/30 bg-[#ff829b]/10 px-4 py-3 text-sm text-[#ffb2c2]">
            {error}
          </p>
        )}

        <section className="rounded-2xl border border-[#ff45c8]/25 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,69,200,0.08),transparent_48%),linear-gradient(155deg,rgba(20,23,48,0.97),rgba(13,16,34,0.98))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#48f7df]">
                Night market · Neon city
              </p>
              <h2 className="mt-1 text-xl font-black text-[#f5f2ff] sm:text-2xl">Jack into the reels</h2>
            </div>
            <span className="rounded-md border border-[#48f7df]/30 bg-[#48f7df]/5 px-2.5 py-1.5 text-[10px] font-black tracking-wider text-[#48f7df]">
              3 ROWS / 5 REELS
            </span>
          </div>

          <div
            ref={stageRef}
            className="mt-4 h-[17rem] overflow-hidden rounded-xl border border-[#48f7df]/20 bg-[#080b18] shadow-[inset_0_0_35px_rgba(72,247,223,0.05),0_0_26px_rgba(255,69,200,0.06)] sm:h-[clamp(20rem,42vw,31rem)]"
            role="img"
            aria-label="Cyberpunk slot machine with three rows and five reels"
          />
          <p className="mt-3 text-center text-xs text-[#9aa8c3]">
            Matching symbols pay from the left across your active fixed paylines.
          </p>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
          <section className="rounded-2xl border border-[#776cb7]/30 bg-[#11152a]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#48f7df]">Configure your run</p>
              <h2 className="mt-1 text-xl font-black text-[#f5f2ff]">Wager controls</h2>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9aa8c3]">
                Bet per line
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {cyberpunkSlotsTheme.betPerLineOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    aria-label={`${amount} GC per line`}
                    aria-pressed={betPerLine === amount}
                    disabled={spinning || retryPendingSpin || !ready}
                    onClick={() => selectBet(amount)}
                    className={`min-h-11 rounded-lg border px-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#48f7df] disabled:cursor-not-allowed disabled:opacity-55 ${
                      betPerLine === amount
                        ? "border-[#48f7df] bg-[#48f7df]/10 text-[#83fff2]"
                        : "border-white/15 bg-white/[0.03] text-[#c4cce0] hover:border-[#48f7df]/60"
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9aa8c3]">
                Active paylines
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {cyberpunkSlotsTheme.activePaylineOptions.map((count) => {
                  const wager = betPerLine * count;
                  const overLimit = Boolean(activeBoost && wager > activeBoost.maxBet);
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-label={`${count} active paylines`}
                      aria-pressed={activePaylineCount === count}
                      title={overLimit ? `Active boost limit: ${activeBoost?.maxBet} GC per spin` : undefined}
                      disabled={spinning || retryPendingSpin || !ready || overLimit}
                      onClick={() => selectLines(count)}
                      className={`min-h-11 rounded-lg border px-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#48f7df] disabled:cursor-not-allowed disabled:opacity-45 ${
                        activePaylineCount === count
                          ? "border-[#48f7df] bg-[#48f7df]/10 text-[#83fff2]"
                          : "border-white/15 bg-white/[0.03] text-[#c4cce0] hover:border-[#48f7df]/60"
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 py-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9aa8c3]">Total bet</span>
              <strong className="font-mono text-xl font-black tabular-nums text-[#fff16b]">
                {formatCredits(totalBet)} <small className="text-[10px] tracking-widest text-[#aab4ca]">GC</small>
              </strong>
            </div>

            <button
              type="button"
              onClick={() => void spin()}
              disabled={!canSpin}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#48f7df] bg-gradient-to-r from-[#48f7df] to-[#7dffe3] text-sm font-black uppercase tracking-widest text-[#07151a] shadow-[0_0_24px_rgba(72,247,223,0.14)] transition hover:-translate-y-px hover:brightness-105 hover:shadow-[0_0_30px_rgba(72,247,223,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff16b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#283c49] disabled:text-[#8396a4] disabled:shadow-none"
            >
              <span aria-hidden="true" className="text-2xl">⟲</span>
              {spinning ? "Reels in motion…" : retryPendingSpin ? "Retry spin" : "Spin the reels"}
            </button>
            <p aria-live="polite" className="mt-3 min-h-10 text-center text-sm text-[#b8c2d7]">
              {exceedsBoostLimit
                ? `This boost allows a maximum total bet of ${formatCredits(activeBoost?.maxBet ?? 0)} GC.`
                : hasInsufficientBalance
                  ? `Not enough GC for this bet. You need ${formatCredits(totalBet)}.`
                  : !sceneReady
                    ? "Loading the reels…"
                    : status}
            </p>
          </section>

          <section className="rounded-2xl border border-[#776cb7]/30 bg-[#11152a]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#48f7df]">Line pays · Per GC bet</p>
              <h2 className="mt-1 text-xl font-black text-[#f5f2ff]">Signal values</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-[#8f9db8]">
                    <th scope="col" className="px-2 py-3 text-left">Symbol</th>
                    <th scope="col" className="px-2 py-3">3</th>
                    <th scope="col" className="px-2 py-3">4</th>
                    <th scope="col" className="px-2 py-3">5</th>
                  </tr>
                </thead>
                <tbody>
                  {cyberpunkSlotsTheme.symbols.map((symbol) => (
                    <tr key={symbol.id} className="border-t border-white/10">
                      <th scope="row" className="flex items-center gap-2 px-2 py-3 text-left text-xs font-bold text-[#d7dced]">
                        <span className="w-6 text-center text-base" style={{ color: symbol.color }} aria-hidden="true">
                          {symbol.glyph}
                        </span>
                        {symbol.label}
                      </th>
                      {([3, 4, 5] as const).map((count) => (
                        <td
                          key={count}
                          className={`px-2 py-3 font-mono font-black ${
                            symbol.id === "seven" ? "text-[#fff16b]" : "text-[#48f7df]"
                          }`}
                        >
                          {cyberpunkSlotsTheme.payouts[symbol.id][count]}×
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#9aa8c3]">
              Multiplier × bet per line. Each active line is evaluated once per spin.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
