"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  columnTargets,
  dozenTargets,
  getNumberColor,
  numberTargets,
  outsideTargets,
  type BetTarget,
  wheelGradient,
  wheelOrder,
} from "@/lib/roulette";
import { useGameSession } from "@/hooks/use-game-session";

const chips = [1, 5, 25, 100];
const numberRows = [3, 2, 1];
const wheelSegmentSize = 360 / wheelOrder.length;
const formatCredits = (amount: number) => amount.toLocaleString("en-US");

interface PlacedChip {
  id: number;
  target: BetTarget;
  amount: number;
}

export default function ClassicRoulettePage() {
  const { balance, ready, error, act } = useGameSession();
  const [selectedChip, setSelectedChip] = useState(5);
  const [bets, setBets] = useState<PlacedChip[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState("Place a chip on the table, then spin.");
  const [result, setResult] = useState<number | null>(null);
  const [returned, setReturned] = useState(0);
  const [recent, setRecent] = useState<Array<{ number: number; color: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nextBetId = useRef(0);
  const pendingSpinId = useRef<string | null>(null);
  const totalWager = bets.reduce((sum, bet) => sum + bet.amount, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    else if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  const placeBet = (target: BetTarget) => {
    if (spinning || !ready || balance - totalWager < selectedChip) return;
    setBets((current) => [...current, { id: nextBetId.current++, target, amount: selectedChip }]);
    setResult(null);
  };

  const targetWager = (targetId: string) =>
    bets.reduce((sum, bet) => sum + (bet.target.id === targetId ? bet.amount : 0), 0);

  const spin = async () => {
    if (spinning || !ready || bets.length === 0 || totalWager > balance) return;
    setSpinning(true);
    setDialogOpen(false);
    setStatus("The ball is in motion...");
    const operationId = pendingSpinId.current ?? crypto.randomUUID();
    pendingSpinId.current = operationId;
    let response: Awaited<ReturnType<typeof act>>;
    try {
      response = await act({
        game: "roulette",
        operationId,
        bets: bets.map((bet) => ({ targetId: bet.target.id, amount: bet.amount })),
      });
      pendingSpinId.current = null;
    } catch {
      setSpinning(false);
      return;
    }

    const winningNumber = Number(response.result?.number);
    if (!Number.isInteger(winningNumber) || winningNumber < 0 || winningNumber > 36) {
      setStatus("The server returned an invalid roulette result.");
      setSpinning(false);
      return;
    }
    const wheelIndex = wheelOrder.indexOf(winningNumber);
    const center = (wheelIndex + 0.5) * wheelSegmentSize;
    const offset = ((rotation % 360) + 360) % 360;
    const alignment = (360 - ((center + offset) % 360)) % 360;
    setRotation(rotation + 360 * 7 + alignment);

    window.setTimeout(() => {
      const color = getNumberColor(winningNumber);
      const payout = Number(response.result?.payout ?? 0);
      setResult(winningNumber);
      setReturned(payout);
      setRecent((previous) => [{ number: winningNumber, color }, ...previous].slice(0, 8));
      setStatus(payout > 0
        ? `Number ${winningNumber} landed. ${formatCredits(payout)} credits returned.`
        : `Number ${winningNumber} landed. No winning bets this round.`);
      setBets([]);
      setSpinning(false);
      setDialogOpen(true);
    }, 5_200);
  };

  const renderTarget = (target: BetTarget, extraClass = "") => {
    const number = target.kind === "number" ? Number(target.label) : null;
    const colorClass = number !== null
      ? `bet-${getNumberColor(number)}`
      : target.id === "red" || target.id === "black"
        ? `bet-${target.id}`
        : "bet-outside";
    const amount = targetWager(target.id);
    return (
      <button
        key={target.id}
        type="button"
        className={`bet-target ${extraClass} ${colorClass}`}
        disabled={spinning || !ready || balance - totalWager < selectedChip}
        aria-label={`Bet on ${target.label}${amount ? `, ${amount} credits already placed` : ""}`}
        onClick={() => placeBet(target)}
      >
        <span>{target.label}</span>
        {amount > 0 && <span className="bet-stake">{amount}</span>}
      </button>
    );
  };

  return (
    <>
      <main className="roulette-app">
        <header className="roulette-header">
          <div className="roulette-brand">
            <p className="eyebrow">The green room</p>
            <h1>Roulette</h1>
          </div>
          <div className="header-actions">
            <Link className="back-link" href="/games">← All games</Link>
            <div className="balance-display" aria-live="polite">
              <span>Play credits</span>
              <strong>$<span>{formatCredits(Math.max(0, balance - totalWager))}</span></strong>
            </div>
          </div>
        </header>

        <div className="roulette-layout">
          <section className="wheel-panel" aria-label="Roulette wheel">
            <div className="wheel-heading">
              <div><p className="eyebrow">European wheel</p><p className="muted">Single zero · 37 pockets</p></div>
              <span className="payout-tag">35 : 1</span>
            </div>
            <div className="wheel-frame">
              <div className="wheel-pointer" aria-hidden="true" />
              <div className="roulette-wheel" aria-hidden="true" style={{ background: wheelGradient, transform: `rotate(${rotation}deg)` }}>
                {wheelOrder.map((number, index) => {
                  const angle = (index + 0.5) * wheelSegmentSize * Math.PI / 180;
                  return (
                    <span
                      className="wheel-number"
                      key={number}
                      style={{ left: `${50 + Math.sin(angle) * 38}%`, top: `${50 - Math.cos(angle) * 38}%` }}
                    >
                      {number}
                    </span>
                  );
                })}
              </div>
              <div className="wheel-hub" aria-hidden="true">
                <span>{result === null ? "Place your bets" : "Last result"}</span>
                <strong>{result === null ? "SPIN" : result}</strong>
              </div>
            </div>
            <p className="game-status" aria-live="polite">{error || status}</p>
            <button className="spin-button" type="button" disabled={spinning || !ready || bets.length === 0} onClick={() => void spin()}>
              {spinning ? "Spinning..." : "Spin the wheel"}
            </button>
            <div className="recent-section">
              <div className="recent-heading"><span className="eyebrow">Recent numbers</span><span className="muted">{recent.length} / 8</span></div>
              <div className="recent-results" aria-live="polite">
                {recent.length === 0
                  ? <span className="empty-recent">Results will appear here</span>
                  : recent.map((item, index) => <span className={`recent-number bet-${item.color}`} key={`${item.number}-${index}`}>{item.number}</span>)}
              </div>
            </div>
          </section>

          <div className="table-column">
            <section className="chip-panel" aria-labelledby="chip-heading">
              <div className="panel-heading">
                <div><p id="chip-heading" className="eyebrow">Your chips</p><p className="muted">Choose a value, then tap a bet</p></div>
                <div className="wager-total"><span>On the table</span><strong>{formatCredits(totalWager)}</strong></div>
              </div>
              <div className="chip-selector" role="group" aria-label="Chip value">
                {chips.map((chip) => (
                  <button
                    className="chip-button"
                    data-value={chip}
                    aria-label={`Select ${chip} credit chip`}
                    aria-pressed={selectedChip === chip}
                    disabled={spinning || !ready || balance - totalWager < chip}
                    key={chip}
                    type="button"
                    onClick={() => setSelectedChip(chip)}
                  >{chip}</button>
                ))}
              </div>
              <div className="table-actions">
                <button className="secondary-button" type="button" disabled={spinning || bets.length === 0} onClick={() => setBets((current) => current.slice(0, -1))}>Undo bet</button>
                <button className="secondary-button" type="button" disabled={spinning || bets.length === 0} onClick={() => setBets([])}>Clear table</button>
                <span className="bet-count">{bets.length} {bets.length === 1 ? "bet" : "bets"}</span>
              </div>
            </section>
            <section className="betting-table" aria-label="Roulette betting table">
              <div className="table-title"><span className="eyebrow">Place your bets</span><span>European · Single zero</span></div>
              <div className="zero-row">{renderTarget(numberTargets[0], "bet-number")}</div>
              <div className="bet-scroll">
                <div className="number-grid" aria-label="Number bets">
                  {Array.from({ length: 12 }, (_, column) =>
                    numberRows.map((row) => renderTarget(numberTargets[column * 3 + row], "bet-number")),
                  )}
                </div>
              </div>
              <div className="target-row three-columns" aria-label="Column bets">{columnTargets.map((target) => renderTarget(target))}</div>
              <div className="target-row three-columns" aria-label="Dozen bets">{dozenTargets.map((target) => renderTarget(target))}</div>
              <div className="target-row outside-row" aria-label="Outside bets">{outsideTargets.map((target) => renderTarget(target))}</div>
              <div className="payout-legend">
                <span>Straight up <strong>35:1</strong></span>
                <span>Dozens &amp; columns <strong>2:1</strong></span>
                <span>Outside bets <strong>1:1</strong></span>
              </div>
            </section>
          </div>
        </div>
      </main>

      <dialog ref={dialogRef} className="result-dialog" aria-labelledby="result-title" onClose={() => setDialogOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}>
        <div className="dialog-content">
          <p id="result-title" className="eyebrow">Round complete</p>
          <p className="dialog-subtitle">The ball landed on</p>
          <div className={`dialog-number bet-${result === null ? "green" : getNumberColor(result)}`}>{result ?? 0}</div>
          <p className="dialog-message">{returned > 0 ? `You won ${formatCredits(returned)} credits` : "No winning bets this round"}</p>
          <p className="dialog-note">{returned > 0 ? "Includes returned winning stakes" : ""}</p>
          <button className="spin-button" type="button" onClick={() => dialogRef.current?.close()}>Keep playing</button>
        </div>
      </dialog>
    </>
  );
}
