"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Prize = {
  label: string;
  multiplier: number;
  angle: number;
  color: string;
};

const prizes: Prize[] = [
  { label: "NO PRIZE", multiplier: 0, angle: 136.5, color: "#ed5b53" },
  { label: "0.5x", multiplier: 0.5, angle: 100, color: "#e8a534" },
  { label: "1x", multiplier: 1, angle: 76, color: "#20a88b" },
  { label: "2x", multiplier: 2, angle: 30, color: "#268ec2" },
  { label: "3x", multiplier: 3, angle: 10, color: "#df5484" },
  { label: "5x", multiplier: 5, angle: 4, color: "#dd7137" },
  { label: "10x", multiplier: 10, angle: 2, color: "#68833b" },
  { label: "25x", multiplier: 25, angle: 1, color: "#52a5c5" },
  { label: "50x", multiplier: 50, angle: 0.5, color: "#d0ad43" },
];

const missSlice = { ...prizes[0], angle: prizes[0].angle / 4 };
const wheelSlices = [
  { ...prizes[1], id: "half" },
  { ...missSlice, id: "miss-1" },
  { ...prizes[5], id: "five" },
  { ...prizes[2], id: "one" },
  { ...missSlice, id: "miss-2" },
  { ...prizes[6], id: "ten" },
  { ...prizes[3], id: "two" },
  { ...missSlice, id: "miss-3" },
  { ...prizes[7], id: "twenty-five" },
  { ...prizes[4], id: "three" },
  { ...missSlice, id: "miss-4" },
  { ...prizes[8], id: "fifty" },
] as const;

const wagers = [5, 10, 25, 50];
const wheelRadius = 128;
const totalWheelAngle = prizes.reduce((total, prize) => total + prize.angle, 0);
const payoutWeightedAngle = prizes.reduce(
  (total, prize) => total + prize.angle * prize.multiplier,
  0
);
const theoreticalRtp = payoutWeightedAngle / totalWheelAngle;
const houseEdge = 1 - theoreticalRtp;
const prizeCenters = wheelSlices.map((prize, index) =>
  wheelSlices.slice(0, index).reduce((angle, previousPrize) => angle + previousPrize.angle, 0) + prize.angle / 2
);
const formatCredits = (amount: number) => amount.toLocaleString("en-US");

const wheelGradient = (() => {
  let start = 0;
  const stops = wheelSlices.map((prize) => {
    const end = start + prize.angle;
    const stop = `${prize.color} ${start}deg ${end}deg`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
})();

function pickPrize() {
  const roll = Math.random() * 360;
  let end = 0;

  for (const prize of wheelSlices) {
    end += prize.angle;
    if (roll < end) return { prize, center: end - prize.angle / 2 };
  }

  const lastPrize = wheelSlices[wheelSlices.length - 1];
  return { prize: lastPrize, center: 360 - lastPrize.angle / 2 };
}

export default function ArcadePage() {
  const [balance, setBalance] = useState(1000);
  const [wager, setWager] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Prize | null>(null);
  const [returned, setReturned] = useState(0);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const resultDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = resultDialogRef.current;
    if (!dialog) return;

    if (isResultDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isResultDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isResultDialogOpen]);

  const handleSpin = () => {
    if (isSpinning || balance < wager) return;

    const selection = pickPrize();
    const currentOffset = ((rotation % 360) + 360) % 360;
    const alignment = (360 - ((selection.center + currentOffset) % 360)) % 360;
    const targetRotation = rotation + 360 * 7 + alignment;

    setBalance((currentBalance) => currentBalance - wager);
    setIsSpinning(true);
    setIsResultDialogOpen(false);
    setResult(null);
    setRotation(targetRotation);

    window.setTimeout(() => {
      const prizeReturn = wager * selection.prize.multiplier;
      setResult(selection.prize);
      setReturned(prizeReturn);
      setBalance((currentBalance) => currentBalance + prizeReturn);
      setIsSpinning(false);
      setIsResultDialogOpen(true);
    }, 5200);
  };

  return (
    <main
      className="min-h-screen px-4 py-5 text-white sm:px-6 sm:py-8"
      style={{
        backgroundColor: "#080c16",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(34, 108, 119, 0.3), transparent 54%), repeating-linear-gradient(135deg, rgba(255,255,255,0.014) 0, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 6px)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#f0c85e]/50 bg-[#1c2730] text-[#f5d66e] shadow-[0_0_25px_rgba(239,188,62,0.12)]">
              <Sparkles aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#61d4bf]">
                Arcade mode
              </p>
              <h1 className="text-2xl font-black tracking-wide sm:text-3xl">Prize wheel</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/85 transition hover:border-[#f0c85e]/60 hover:bg-white/10"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Roulette table
            </Link>
            <div className="flex items-center gap-3 rounded-lg border border-[#f0c85e]/25 bg-[#151d28]/90 px-4 py-2.5">
              <Coins aria-hidden="true" className="h-4 w-4 text-[#f0c85e]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Credits</span>
              <span className="font-mono text-xl font-bold tabular-nums text-[#f5d66e]">{formatCredits(balance)}</span>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121927]/85 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-7">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-[#42d6c0]/10" />
            <div className="relative mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#61d4bf]">Spin for a multiplier</p>
                <p className="mt-1 text-sm text-white/50">Higher prizes have slimmer slices</p>
              </div>
              <span className="rounded-md border border-[#f0c85e]/25 bg-[#f0c85e]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f5d66e]">Bonus wheel</span>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[440px] rounded-full border-[10px] border-[#d1aa48] bg-[#684e20] p-2 shadow-[0_16px_38px_rgba(0,0,0,0.52),inset_0_0_0_2px_#fae296]">
              <div
                role="button"
                tabIndex={0}
                aria-label={isSpinning ? "Prize wheel is spinning" : "Spin the prize wheel"}
                aria-disabled={isSpinning || balance < wager}
                onClick={handleSpin}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSpin();
                  }
                }}
                className={`absolute inset-2 rounded-full border-[3px] border-[#f6db7b] transition-transform duration-[5200ms] ease-[cubic-bezier(0.12,0.83,0.2,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#61d4bf] focus-visible:ring-offset-4 focus-visible:ring-offset-[#121927] ${isSpinning || balance < wager ? "cursor-not-allowed" : "cursor-pointer"}`}
                style={{ background: wheelGradient, transform: `rotate(${rotation}deg)` }}
              >
                {wheelSlices.map((prize, index) => {
                  if (prize.angle < 10) return null;
                    const center = prizeCenters[index];
                    return (
                      <span
                        key={prize.id}
                        className="pointer-events-none absolute left-1/2 top-1/2 grid place-items-center rounded-full bg-black/15 px-1 py-0.5 font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{
                          fontSize: prize.angle < 22 ? "8px" : prize.angle < 35 ? "9px" : "11px",
                          transform: `translate(-50%, -50%) rotate(${center}deg) translateY(-${wheelRadius}px) rotate(${-center - rotation}deg)`,
                        }}
                      >
                        {prize.multiplier === 0 ? "MISS" : prize.label}
                      </span>
                    );
                  })}
              </div>
              <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[25px] border-l-transparent border-r-transparent border-t-[#fff0a3]" />
              </div>
              <div className="pointer-events-none absolute inset-[35%] z-10 grid place-items-center rounded-full border-[5px] border-[#edc65b] bg-[radial-gradient(circle_at_35%_30%,#314050,#111722_72%)] text-center shadow-[0_0_0_5px_#18212d,0_8px_24px_rgba(0,0,0,0.6)]">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#a7bdc3]">{result ? "Last prize" : "Spin"}</p>
                  <p className="mt-1 font-mono text-3xl font-black leading-none text-[#f5d66e]">{result ? result.label : "GO!"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Your wager</p>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-[#f5d66e]">{formatCredits(wager)} credits</p>
                </div>
                <p aria-live="polite" className="text-right text-xs font-semibold text-[#61d4bf]">
                  {isSpinning ? "Wheel in motion..." : "Tap the wheel to play"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {wagers.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setWager(amount)}
                    disabled={isSpinning || balance < amount}
                    aria-pressed={wager === amount}
                    className={`min-w-14 rounded-lg border px-4 py-2 font-mono text-sm font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d66e] disabled:cursor-not-allowed disabled:opacity-40 ${wager === amount ? "border-[#f5d66e] bg-[#f5d66e] text-[#17202a] shadow-[0_0_18px_rgba(245,214,110,0.2)]" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"}`}
                  >
                    {amount}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBalance(1000)}
                  disabled={isSpinning || balance >= 5}
                  className="ml-auto border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                >
                  <Coins aria-hidden="true" /> Refill
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#121927]/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#61d4bf]">Prize board</p>
                  <p className="mt-1 text-xs text-white/45">Multiplier is applied to your wager</p>
                </div>
                <Sparkles aria-hidden="true" className="h-5 w-5 text-[#f5d66e]" />
              </div>
              <div className="space-y-2">
                {prizes.map((prize) => {
                  const chance = `${(prize.angle / totalWheelAngle * 100).toFixed(prize.angle < 10 ? 2 : prize.angle < 36 ? 1 : 0)}%`;
                  return (
                    <div key={prize.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: prize.color, boxShadow: `0 0 10px ${prize.color}66` }} />
                      <span className="min-w-0 flex-1 text-sm font-semibold text-white/90">{prize.multiplier === 0 ? "No prize" : `${prize.multiplier}× payout`}</span>
                      <span className="font-mono text-xs tabular-nums text-white/45">{chance}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <div className="rounded-lg bg-black/15 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Theoretical RTP</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#61d4bf]">{(theoreticalRtp * 100).toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-black/15 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">House edge</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#f5d66e]">{(houseEdge * 100).toFixed(2)}%</p>
                </div>
                <div className="col-span-2 rounded-lg bg-black/15 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Expected net per spin</p>
                    <p className="font-mono text-sm font-bold tabular-nums text-[#f2a39b]">Player -{formatCredits(wager * houseEdge)} · House +{formatCredits(wager * houseEdge)}</p>
                  </div>
                  <p className="mt-1 text-[10px] text-white/35">{payoutWeightedAngle}° weighted return ÷ {totalWheelAngle}° total = {(theoreticalRtp * 100).toFixed(2)}% RTP</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-white/40">
                The miss chance is split across four wedges; the board shows their combined probability.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#121927]/85 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#61d4bf]">How to play</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">Pick your wager, then tap the wheel. Land on a multiplier to add credits to your balance.</p>
                </div>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#61d4bf]/25 bg-[#61d4bf]/10 font-mono font-black text-[#61d4bf]">×</div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <dialog
        ref={resultDialogRef}
        aria-labelledby="arcade-result-title"
        onClose={() => setIsResultDialogOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) resultDialogRef.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#f0c85e]/45 bg-[#121927] p-0 text-white shadow-2xl shadow-black/60 backdrop:bg-[#04070c]/80"
      >
        <div className="p-6 text-center sm:p-8">
          <p id="arcade-result-title" className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#61d4bf]">Wheel complete</p>
          {result && (
            <>
              <p className="mt-3 text-sm text-white/55">You landed on</p>
              <div className="mx-auto mt-3 inline-flex min-h-20 items-center justify-center rounded-xl border border-[#f0c85e]/40 px-6 text-4xl font-black text-[#f5d66e] shadow-[0_0_28px_rgba(245,214,110,0.08)]">
                {result.multiplier === 0 ? "MISS" : result.label}
              </div>
              <p className="mt-4 text-lg font-bold text-white">
                {returned > wager ? `You won ${formatCredits(returned)} credits` : returned > 0 ? `${formatCredits(returned)} credits returned` : "No prize this time"}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {returned > 0 ? `Your ${formatCredits(wager)} credit wager is included` : `${formatCredits(wager)} credits wagered`}
              </p>
            </>
          )}
          <Button
            onClick={() => resultDialogRef.current?.close()}
            autoFocus
            className="mt-7 min-w-36 bg-[#f0c85e] font-bold text-[#17202a] hover:bg-[#ffdc79]"
          >
            Spin again
          </Button>
        </div>
      </dialog>
    </main>
  );
}
