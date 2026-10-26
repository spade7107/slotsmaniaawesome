"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  columnTargets,
  dozenTargets,
  getNumberColor,
  getWinningReturn,
  numberTargets,
  outsideTargets,
  type BetTarget,
  type PlacedBet,
  type RouletteColor,
  wheelGradient,
  wheelOrder,
} from "@/lib/roulette";

const chips = [
  { value: 1, color: "#f4f0df" },
  { value: 5, color: "#d44b43" },
  { value: 25, color: "#398b67" },
  { value: 100, color: "#4175bb" },
];

const numberRows = [3, 2, 1];
const wheelSegmentSize = 360 / wheelOrder.length;
const numberLabelRadius = 126;
const formatCredits = (amount: number) => amount.toLocaleString("en-US");

type RouletteResult = {
  number: number;
  color: RouletteColor;
  returned: number;
};

function colorClasses(color: RouletteColor) {
  if (color === "green") return "bg-[#237954] text-white";
  if (color === "red") return "bg-[#b83834] text-white";
  return "bg-[#202622] text-white";
}

export default function Home() {
  const [balance, setBalance] = useState(1000);
  const [selectedChip, setSelectedChip] = useState(5);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [recentResults, setRecentResults] = useState<{ number: number; color: RouletteColor }[]>([]);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const resultDialogRef = useRef<HTMLDialogElement>(null);
  const nextBetId = useRef(0);

  useEffect(() => {
    const dialog = resultDialogRef.current;
    if (!dialog) return;

    if (isResultDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isResultDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isResultDialogOpen]);

  const totalWager = bets.reduce((total, bet) => total + bet.amount, 0);
  const getTargetWager = (targetId: string) =>
    bets.reduce(
      (total, bet) => total + (bet.target.id === targetId ? bet.amount : 0),
      0
    );

  const handlePlaceBet = (target: BetTarget) => {
    if (isSpinning || balance < selectedChip) return;

    setBalance((currentBalance) => currentBalance - selectedChip);
    setBets((currentBets) => [
      ...currentBets,
      { id: nextBetId.current++, target, amount: selectedChip },
    ]);
    setResult(null);
  };

  const handleUndoBet = () => {
    if (isSpinning || bets.length === 0) return;

    const lastBet = bets[bets.length - 1];
    setBets((currentBets) => currentBets.slice(0, -1));
    setBalance((currentBalance) => currentBalance + lastBet.amount);
  };

  const handleClearBets = () => {
    if (isSpinning || bets.length === 0) return;

    setBalance((currentBalance) => currentBalance + totalWager);
    setBets([]);
    setResult(null);
  };

  const handleSpin = () => {
    if (isSpinning || bets.length === 0) return;

    const winningNumber = Math.floor(Math.random() * 37);
    const wheelIndex = wheelOrder.indexOf(winningNumber);
    const currentOffset = ((rotation % 360) + 360) % 360;
    const winningAngle = (wheelIndex + 0.5) * wheelSegmentSize;
    const alignment = (360 - ((winningAngle + currentOffset) % 360)) % 360;
    const targetRotation = rotation + 360 * 7 + alignment;

    setIsSpinning(true);
    setResult(null);
    setIsResultDialogOpen(false);
    setRotation(targetRotation);

    window.setTimeout(() => {
      const color = getNumberColor(winningNumber);
      const returned = getWinningReturn(bets, winningNumber);
      const roundResult = { number: winningNumber, color, returned };

      setResult(roundResult);
      setRecentResults((previousResults) => [
        { number: winningNumber, color },
        ...previousResults,
      ].slice(0, 8));
      setBalance((currentBalance) => currentBalance + returned);
      setBets([]);
      setIsSpinning(false);
      setIsResultDialogOpen(true);
    }, 5200);
  };

  const renderBetTarget = (target: BetTarget, extraClasses = "") => {
    const wager = getTargetWager(target.id);
    const number = target.kind === "number" ? Number(target.label) : null;
    const tone = number !== null
      ? colorClasses(getNumberColor(number))
      : target.id === "red"
        ? "bg-[#b83834] text-white"
        : target.id === "black"
          ? "bg-[#202622] text-white"
          : "bg-[#154633] text-[#f4ead0]";

    return (
      <button
        key={target.id}
        type="button"
        onClick={() => handlePlaceBet(target)}
        disabled={isSpinning || balance < selectedChip}
        aria-label={`Bet on ${target.label}${wager ? `, ${wager} credits already placed` : ""}`}
        className={`relative flex min-h-11 items-center justify-center border border-[#c8ab6e]/45 font-semibold transition hover:brightness-125 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d28a] disabled:cursor-not-allowed disabled:opacity-55 ${tone} ${extraClasses}`}
      >
        <span>{target.label}</span>
        {wager > 0 && (
          <span className="absolute -right-1 -top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#f4ead0] bg-[#d6b566] px-1 text-[10px] font-black text-[#1b211c] shadow-lg">
            {wager}
          </span>
        )}
      </button>
    );
  };

  return (
    <main
      className="min-h-screen px-3 py-5 text-[#f4ead0] sm:px-6 sm:py-8"
      style={{
        backgroundColor: "#08130e",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(48, 103, 69, 0.32), transparent 56%), repeating-linear-gradient(135deg, rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 6px)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#d3b975]/20 pb-5 sm:mb-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[#dfc17b]/70 bg-[#183b2a] text-xl font-black text-[#f1d28a] shadow-[0_0_24px_rgba(204,170,96,0.12)]">
              0
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#c9ad70]">
                The green room
              </p>
              <h1 className="mt-0.5 text-2xl font-black tracking-wide text-[#fff7e5] sm:text-3xl">
                Roulette
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/arcade"
              className="inline-flex items-center gap-2 rounded-lg border border-[#c9ad70]/30 bg-[#17251c] px-3 py-2.5 text-xs font-semibold text-[#ead7a5] transition hover:border-[#c9ad70]/70 hover:bg-[#203629]"
            >
              <Sparkles aria-hidden="true" className="h-4 w-4" /> Arcade wheel
            </Link>
            <div className="flex items-center gap-3 rounded-lg border border-[#d3b975]/30 bg-[#111e17]/90 px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a9b4a9]">
                Play credits
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-[#f1d28a]">
                {formatCredits(balance)}
              </span>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
          <section className="rounded-xl border border-[#d3b975]/20 bg-[#101d16]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9ad70]">
                  European wheel
                </p>
                <p className="mt-1 text-xs text-[#98a79a]">Single zero · 37 pockets</p>
              </div>
              <div className="rounded border border-[#d3b975]/25 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-[#d6c28f]">
                35 : 1
              </div>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[390px] rounded-full border-[7px] border-[#b99a5b] bg-[#755b32] p-[7px] shadow-[0_10px_38px_rgba(0,0,0,0.45),inset_0_0_0_2px_#e2c77f]">
              <div
                role="button"
                tabIndex={0}
                aria-label={isSpinning ? "Roulette wheel is spinning" : bets.length === 0 ? "Place a bet to spin the roulette wheel" : "Tap to spin the roulette wheel"}
                aria-disabled={isSpinning || bets.length === 0}
                onClick={handleSpin}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSpin();
                  }
                }}
                className={`absolute inset-[7px] rounded-full border-[3px] border-[#e0c47b] shadow-[inset_0_0_0_4px_rgba(18,26,20,0.7)] transition-transform duration-[5200ms] ease-[cubic-bezier(0.12,0.83,0.2,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f1d28a] focus-visible:ring-offset-4 focus-visible:ring-offset-[#101d16] ${isSpinning || bets.length === 0 ? "cursor-not-allowed" : "cursor-pointer"}`}
                style={{ background: wheelGradient, transform: `rotate(${rotation}deg)` }}
              >
                {wheelOrder.map((number, index) => {
                  const angle = (index + 0.5) * wheelSegmentSize;
                  return (
                    <span
                      key={number}
                      className="pointer-events-none absolute left-1/2 top-1/2 grid h-5 w-5 place-items-center rounded-full bg-black/15 text-[9px] font-bold tabular-nums text-white sm:text-[10px]"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${numberLabelRadius}px) rotate(${-angle - rotation}deg)`,
                      }}
                    >
                      {number}
                    </span>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[22px] border-l-transparent border-r-transparent border-t-[#f1d28a]" />
              </div>
              <div className="pointer-events-none absolute inset-[34%] z-10 grid place-items-center rounded-full border-[5px] border-[#c9a964] bg-[radial-gradient(circle_at_35%_30%,#27392b,#101811_72%)] text-center shadow-[0_0_0_4px_#17221a,0_8px_20px_rgba(0,0,0,0.55)]">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#bba66f]">
                    {result ? "Last result" : "Place your bets"}
                  </p>
                  <p className={`mt-1 font-mono text-4xl font-black leading-none ${result ? (result.color === "red" ? "text-[#e56a61]" : result.color === "green" ? "text-[#62bd8b]" : "text-white") : "text-[#f1d28a]"}`}>
                    {result ? result.number : "SPIN"}
                  </p>
                </div>
              </div>
            </div>

            <p aria-live="polite" className="mt-5 min-h-5 text-center text-sm font-semibold text-[#e2ce98]">
              {isSpinning
                ? "The ball is in motion..."
                : bets.length
                  ? "Tap the wheel to spin"
                  : "Place a chip on the table, then tap the wheel to spin"}
            </p>

            <div className="mt-6 border-t border-[#d3b975]/15 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a9b4a9]">
                  Recent numbers
                </p>
                <span className="text-xs tabular-nums text-[#c9ad70]">{recentResults.length} / 8</span>
              </div>
              <div className="flex min-h-9 flex-wrap gap-2">
                {recentResults.length ? recentResults.map((recent, index) => (
                  <span
                    key={`${recent.number}-${index}`}
                    className={`grid h-8 w-8 place-items-center rounded-full border border-white/15 font-mono text-xs font-bold ${colorClasses(recent.color)}`}
                  >
                    {recent.number}
                  </span>
                )) : <span className="text-xs text-[#758378]">Results will appear here</span>}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-[#d3b975]/20 bg-[#101d16]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9ad70]">
                    Your chips
                  </p>
                  <p className="mt-1 text-xs text-[#98a79a]">Choose a value, then tap a bet</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98a79a]">On the table</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#f1d28a]">{formatCredits(totalWager)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {chips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setSelectedChip(chip.value)}
                    disabled={isSpinning}
                    aria-pressed={selectedChip === chip.value}
                    aria-label={`Select ${chip.value} credit chip`}
                    className={`grid h-12 w-12 place-items-center rounded-full border-[3px] font-mono text-sm font-black shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60 ${selectedChip === chip.value ? "scale-110 ring-2 ring-[#f1d28a] ring-offset-2 ring-offset-[#101d16]" : "opacity-80"}`}
                    style={{ backgroundColor: chip.color, color: chip.value === 1 ? "#172018" : "#fff", borderColor: chip.value === 1 ? "#fff9df" : "rgba(255,255,255,0.75)" }}
                  >
                    {chip.value}
                  </button>
                ))}
                <span className="ml-auto text-xs text-[#a9b4a9]">
                  Selected: <strong className="text-[#f1d28a]">{selectedChip}</strong>
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#d3b975]/15 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoBet}
                  disabled={isSpinning || bets.length === 0}
                  className="border-[#d3b975]/25 bg-[#17251c] text-[#e8ddbd] hover:bg-[#203629]"
                >
                  <Undo2 aria-hidden="true" /> Undo bet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearBets}
                  disabled={isSpinning || bets.length === 0}
                  className="border-[#d3b975]/25 bg-[#17251c] text-[#e8ddbd] hover:bg-[#203629]"
                >
                  <RotateCcw aria-hidden="true" /> Clear table
                </Button>
                <span className="ml-auto self-center text-xs text-[#98a79a]">
                  {bets.length} {bets.length === 1 ? "bet" : "bets"}
                </span>
              </div>
            </section>

            <section aria-label="Roulette betting table" className="rounded-xl border border-[#c9a964]/40 bg-[#145337] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.26)] sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0dba5]">Place your bets</p>
                <span className="text-[10px] font-semibold tracking-wide text-[#a9c5ac]">EUROPEAN · SINGLE ZERO</span>
              </div>

              <div className="space-y-2">
                {renderBetTarget(numberTargets[0], "min-h-10 w-full rounded-sm")}

                <div className="overflow-x-auto pb-1">
                  <div className="grid min-w-[560px] grid-flow-col grid-rows-3 grid-cols-[repeat(12,minmax(0,1fr))] gap-1">
                    {Array.from({ length: 36 }, (_, index) => {
                      const column = Math.floor(index / 3);
                      const row = index % 3;
                      const number = column * 3 + numberRows[row];
                      return renderBetTarget(
                        numberTargets[number],
                        "aspect-[1/1.18] min-h-10 rounded-sm p-0 text-sm"
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {columnTargets.map((target) => renderBetTarget(target, "rounded-sm px-1 text-[10px] sm:text-xs"))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {dozenTargets.map((target) => renderBetTarget(target, "rounded-sm px-1 text-xs"))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {outsideTargets.map((target) => renderBetTarget(target, "rounded-sm px-1 text-[10px] sm:text-xs"))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[10px] text-[#c0d2c2]">
                <span>Straight up <strong className="text-white">35:1</strong></span>
                <span>Dozens &amp; columns <strong className="text-white">2:1</strong></span>
                <span>Outside bets <strong className="text-white">1:1</strong></span>
              </div>
            </section>
          </div>
        </div>
      </div>

      <dialog
        ref={resultDialogRef}
        aria-labelledby="result-dialog-title"
        onClose={() => setIsResultDialogOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) resultDialogRef.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-[#c9a964]/50 bg-[#101d16] p-0 text-[#f4ead0] shadow-2xl shadow-black/50 backdrop:bg-black/75"
      >
        <div className="p-6 text-center sm:p-8">
          <p id="result-dialog-title" className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c9ad70]">
            Round complete
          </p>
          {result && (
            <>
              <p className="mt-3 text-sm text-[#a9b4a9]">The ball landed on</p>
              <div className={`mx-auto mt-3 grid h-20 w-20 place-items-center rounded-full border-[5px] border-[#e3cb88] font-mono text-4xl font-black shadow-lg ${colorClasses(result.color)}`}>
                {result.number}
              </div>
              <p className="mt-4 text-lg font-bold text-[#fff7e5]">
                {result.returned > 0 ? `You won ${formatCredits(result.returned)} credits` : "No winning bets this round"}
              </p>
              {result.returned > 0 && (
                <p className="mt-1 text-xs text-[#98a79a]">Includes returned winning stakes</p>
              )}
            </>
          )}
          <Button
            onClick={() => resultDialogRef.current?.close()}
            autoFocus
            className="mt-7 min-w-32 bg-[#c5a45f] font-bold text-[#152017] hover:bg-[#d6b975]"
          >
            Keep playing
          </Button>
        </div>
      </dialog>
    </main>
  );
}
