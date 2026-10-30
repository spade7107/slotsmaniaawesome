"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameSession } from "@/hooks/use-game-session";

const prizes = [
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
  { ...prizes[1], id: "half" }, { ...missSlice, id: "miss-1" }, { ...prizes[5], id: "five" },
  { ...prizes[2], id: "one" }, { ...missSlice, id: "miss-2" }, { ...prizes[6], id: "ten" },
  { ...prizes[3], id: "two" }, { ...missSlice, id: "miss-3" }, { ...prizes[7], id: "twenty-five" },
  { ...prizes[4], id: "three" }, { ...missSlice, id: "miss-4" }, { ...prizes[8], id: "fifty" },
];
const wagers = [5, 10, 25, 50];
const totalAngle = prizes.reduce((total, prize) => total + prize.angle, 0);
const weightedAngle = prizes.reduce((total, prize) => total + prize.angle * prize.multiplier, 0);
const rtp = weightedAngle / totalAngle;
const houseEdge = 1 - rtp;
const prizeCenters = wheelSlices.map((prize, index) =>
  wheelSlices.slice(0, index).reduce((angle, previous) => angle + previous.angle, 0) + prize.angle / 2,
);
const formatCredits = (amount: number) => amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
const gradient = (() => {
  let start = 0;
  return `conic-gradient(${wheelSlices.map((prize) => {
    const end = start + prize.angle;
    const stop = `${prize.color} ${start}deg ${end}deg`;
    start = end;
    return stop;
  }).join(", ")})`;
})();

export default function ClassicPrizeWheelPage() {
  const { balance, ready, error, act } = useGameSession();
  const [wager, setWager] = useState(10);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<(typeof wheelSlices)[number] | null>(null);
  const [returned, setReturned] = useState(0);
  const [status, setStatus] = useState("Choose your wager, then spin.");
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingSpinId = useRef<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    else if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  const spin = async () => {
    if (spinning || !ready || balance < wager) return;
    setSpinning(true);
    setDialogOpen(false);
    setStatus("Wheel in motion...");
    const operationId = pendingSpinId.current ?? crypto.randomUUID();
    pendingSpinId.current = operationId;
    let response: Awaited<ReturnType<typeof act>>;
    try {
      response = await act({ game: "prize-wheel", operationId, wager });
      pendingSpinId.current = null;
    } catch {
      setSpinning(false);
      return;
    }

    const index = Number(response.result?.sliceIndex);
    const selected = wheelSlices[index];
    if (!selected) {
      setStatus("The server returned an invalid prize-wheel result.");
      setSpinning(false);
      return;
    }
    const center = Number(response.result?.center);
    const offset = ((rotation % 360) + 360) % 360;
    const alignment = (360 - ((center + offset) % 360)) % 360;
    setRotation(rotation + 360 * 7 + alignment);
    window.setTimeout(() => {
      const payout = Number(response.result?.payout ?? 0);
      setResult(selected);
      setReturned(payout);
      setStatus(payout > 0
        ? `${selected.label} landed. ${formatCredits(payout)} credits returned.`
        : "No prize this time. Choose a wager and try again.");
      setSpinning(false);
      setDialogOpen(true);
    }, 5_200);
  };

  return (
    <>
      <main className="prize-app">
        <header className="prize-header">
          <div><p className="eyebrow">Arcade mode</p><h1>Prize wheel</h1></div>
          <div className="header-actions">
            <Link className="back-link" href="/games">← All games</Link>
            <div className="balance-display"><span>Play credits</span><strong>$<span>{formatCredits(balance)}</span></strong></div>
          </div>
        </header>

        <div className="prize-layout">
          <section className="wheel-panel" aria-label="Prize wheel">
            <div className="wheel-heading">
              <div><p className="eyebrow">Spin for a multiplier</p><p className="muted">Higher prizes have slimmer slices</p></div>
              <span className="payout-tag">Bonus wheel</span>
            </div>
            <div className="wheel-frame">
              <div className="wheel-pointer" aria-hidden="true" />
              <div className="prize-wheel" aria-hidden="true" style={{ background: gradient, transform: `rotate(${rotation}deg)` }}>
                {wheelSlices.map((prize, index) => {
                  if (prize.angle < 10) return null;
                  const center = prizeCenters[index];
                  const radius = 34;
                  return (
                    <span
                      className="wheel-label"
                      key={prize.id}
                      style={{
                        left: `${50 + Math.sin(center * Math.PI / 180) * radius}%`,
                        top: `${50 - Math.cos(center * Math.PI / 180) * radius}%`,
                      }}
                    >
                      {prize.multiplier === 0 ? "MISS" : prize.label}
                    </span>
                  );
                })}
              </div>
              <div className="wheel-hub" aria-hidden="true">
                <span>{result ? "Last prize" : "Spin"}</span><strong>{result ? result.label : "GO!"}</strong>
              </div>
            </div>
            <p className="game-status" aria-live="polite">{error || status}</p>
            <button className="spin-button" type="button" disabled={spinning || !ready || balance < wager} onClick={() => void spin()}>
              {spinning ? "Spinning..." : "Spin the wheel"}
            </button>
            <div className="wager-panel">
              <div><p className="eyebrow">Your wager</p><strong><span>{formatCredits(wager)}</span> credits</strong></div>
              <div className="wager-selector" role="group" aria-label="Wager amount">
                {wagers.map((amount) => (
                  <button
                    className="wager-button"
                    key={amount}
                    type="button"
                    disabled={spinning || !ready || balance < amount}
                    aria-label={`Wager ${amount} credits`}
                    aria-pressed={wager === amount}
                    onClick={() => setWager(amount)}
                  >{amount}</button>
                ))}
              </div>
            </div>
          </section>

          <aside className="prize-board">
            <div className="board-heading">
              <div><p className="eyebrow">Prize board</p><p className="muted">Multiplier is applied to your wager</p></div>
              <span className="sparkle-mark" aria-hidden="true">✦</span>
            </div>
            <div className="prize-list">
              {prizes.map((prize) => (
                <div className="prize-row" key={prize.label}>
                  <span className="prize-swatch" style={{ backgroundColor: prize.color, color: prize.color }} />
                  <span className="prize-name">{prize.multiplier === 0 ? "No prize" : `${prize.multiplier}x payout`}</span>
                  <span className="prize-chance">
                    {(prize.angle / totalAngle * 100).toFixed(prize.angle < 10 ? 2 : prize.angle < 36 ? 1 : 0)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="metrics-grid">
              <div className="metric"><span>Theoretical RTP</span><strong>{(rtp * 100).toFixed(2)}%</strong></div>
              <div className="metric"><span>House edge</span><strong>{(houseEdge * 100).toFixed(2)}%</strong></div>
              <div className="metric metric-wide">
                <span>Expected net per spin</span><strong>-{formatCredits(wager * houseEdge)} credits</strong>
                <small>{weightedAngle} weighted return / {totalAngle} total = {(rtp * 100).toFixed(2)}% RTP</small>
              </div>
            </div>
            <p className="board-note">The miss chance is split across four wedges; the board shows their combined probability.</p>
          </aside>
        </div>
      </main>
      <dialog ref={dialogRef} className="result-dialog" aria-labelledby="result-title" onClose={() => setDialogOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}>
        <div className="dialog-content">
          <p id="result-title" className="eyebrow">Wheel complete</p>
          <p className="dialog-subtitle">You landed on</p>
          <div className="dialog-prize">{result?.label ?? "MISS"}</div>
          <p className="dialog-message">{returned > wager ? `You won ${formatCredits(returned)} credits` : returned > 0 ? `${formatCredits(returned)} credits returned` : "No prize this time"}</p>
          <p className="dialog-note">{returned > 0 ? `Your ${formatCredits(wager)} credit wager is included` : `${formatCredits(wager)} credits wagered`}</p>
          <button className="spin-button" type="button" onClick={() => dialogRef.current?.close()}>Spin again</button>
        </div>
      </dialog>
    </>
  );
}
