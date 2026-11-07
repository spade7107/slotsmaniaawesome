"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useGameSession } from "@/hooks/use-game-session";

interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
}

interface RoundView {
  playerHand: Card[];
  dealerHand: Array<Card | null>;
  playerScore: number;
  dealerScore: number | null;
  status: string;
  payout: number;
}

function isCard(value: unknown): value is Card {
  return typeof value === "object" && value !== null &&
    "suit" in value && ["♠", "♥", "♦", "♣"].includes(String(value.suit)) &&
    "value" in value && typeof value.value === "string";
}

function readRound(value: unknown): RoundView | null {
  if (typeof value !== "object" || value === null) return null;
  const state = value as Record<string, unknown>;
  if (
    !Array.isArray(state.playerHand) ||
    !state.playerHand.every(isCard) ||
    !Array.isArray(state.dealerHand) ||
    !state.dealerHand.every((card) => card === null || isCard(card)) ||
    typeof state.playerScore !== "number" ||
    (state.dealerScore !== null && typeof state.dealerScore !== "number") ||
    typeof state.status !== "string" ||
    typeof state.payout !== "number"
  ) {
    return null;
  }
  return {
    playerHand: state.playerHand,
    dealerHand: state.dealerHand,
    playerScore: state.playerScore,
    dealerScore: state.dealerScore,
    status: state.status,
    payout: state.payout,
  };
}

function CardFace({ card }: { card: Card }) {
  const suitColor = card.suit === "♥" || card.suit === "♦" ? "#bd434b" : "#172235";

  return (
    <svg
      viewBox="0 0 64 96"
      className="h-full w-full"
      role="img"
      aria-label={`${card.value} of ${card.suit}`}
    >
      <rect x="1" y="1" width="62" height="94" rx="7" fill="#f3f6fb" stroke="#a5b1c2" strokeWidth="2" />
      <text x="8" y="23" fill={suitColor} fontSize="16" fontWeight="700">{card.value}</text>
      <text x="8" y="39" fill={suitColor} fontSize="14">{card.suit}</text>
      <text x="32" y="64" textAnchor="middle" fill={suitColor} fontSize="34">{card.suit}</text>
      <g transform="rotate(180 55 80)" fill={suitColor}>
        <text x="55" y="76" textAnchor="end" fontSize="16" fontWeight="700">{card.value}</text>
        <text x="55" y="90" textAnchor="end" fontSize="14">{card.suit}</text>
      </g>
    </svg>
  );
}

function CardBack({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 64 96" className="h-full w-full" role="img" aria-label={label}>
      <rect x="1" y="1" width="62" height="94" rx="7" fill="#17283c" stroke="#a5b1c2" strokeWidth="2" />
      <path d="m32 27 19 21-19 21-19-21Z" fill="#0d1117" stroke="#67d8c6" strokeWidth="2" />
      <circle cx="32" cy="48" r="6" fill="#f3cc70" />
    </svg>
  );
}

function statusMessage(status: string) {
  switch (status) {
    case "blackjack": return "Blackjack! You win!";
    case "bust": return "Bust! You lose.";
    case "dealer-bust": return "Dealer busts! You win!";
    case "win": return "You win!";
    case "push": return "Push (Tie).";
    case "lose": return "Dealer wins.";
    default: return "Hit or Stand?";
  }
}

export default function BlackjackPage() {
  const { balance, ready, error, activeBlackjack, act } = useGameSession();
  const [round, setRound] = useState<RoundView | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"hit" | "stand" | null>(null);
  const [message, setMessage] = useState("Place your bet to start");
  const requestId = useRef<string | null>(null);
  const remoteRound = activeBlackjack ? readRound(activeBlackjack.public_state) : null;
  const currentRound = round ?? remoteRound;
  const currentGameId = gameId ?? activeBlackjack?.id ?? null;

  const runAction = async (action: "start" | "hit" | "stand", bet?: number) => {
    if (!ready || busy) return;
    flushSync(() => {
      setBusy(true);
      setPendingAction(action === "hit" || action === "stand" ? action : null);
      setMessage(action === "start" ? "Dealing..." : action === "hit" ? "Drawing a card..." : "Dealer's turn...");
    });
    const operationId = requestId.current ?? crypto.randomUUID();
    requestId.current = operationId;
    try {
      const response = await act(action === "start"
        ? { game: "blackjack", action, wager: bet, operationId }
        : { game: "blackjack", action, gameId: currentGameId, operationId });
      requestId.current = null;
      const nextRound = readRound(response.result);
      if (!nextRound) throw new Error("The server returned an invalid blackjack round");
      setRound(nextRound);
      setGameId(response.complete ? null : response.gameId ?? currentGameId);
      setMessage(statusMessage(nextRound.status));
    } catch {
      setMessage(action === "start" ? "Could not place bet." : "Could not update this round.");
    } finally {
      setPendingAction(null);
      setBusy(false);
    }
  };

  const roundComplete = !currentGameId && Boolean(currentRound);
  const active = Boolean(currentGameId);
  const visibleMessage = activeBlackjack && !round
    ? statusMessage(String(remoteRound?.status ?? "playing"))
    : message;

  return (
    <>
      <div className="home">
        <Link href="/">Home</Link>
      </div>
      <div className="balance">
        <p>Balance: <span id="balance">{ready ? balance.toLocaleString("en-US") : "…"}</span> GC</p>
      </div>
      <header className="p-4 text-center bg-emerald-950 shadow-md">
        <h1 className="text-3xl font-bold tracking-wider">BLACKJACK</h1>
      </header>

      <main className="flex-grow flex flex-col items-center justify-around p-4 max-w-xl mx-auto w-full">
        <div className="bg-emerald-800/60 p-4 rounded-xl w-full text-center border border-emerald-700/50 shadow-inner">
          <h2 className="text-lg font-semibold mb-2 text-emerald-200">
            Dealer <span id="dealer-score" className="text-xl font-semibold">
              {currentRound?.dealerScore === null || currentRound?.dealerScore === undefined ? "" : `(${currentRound.dealerScore})`}
            </span>
          </h2>
          <div id="dealer-cards" className="flex justify-center gap-2 min-h-[96px] items-center">
            {currentRound?.dealerHand.map((card, index) => (
              card ? (
                <div className="w-16 h-24 bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center p-1 border border-slate-200 relative animate-deal-dealer" key={`dealer-${index}-${card.value}-${card.suit}`}>
                  <CardFace card={card} />
                </div>
              ) : (
                <div
                  className={`w-16 h-24 rounded-lg shadow-md overflow-hidden animate-deal-dealer ${pendingAction === "stand" ? "pending-card" : ""}`}
                  key={`dealer-${index}-hidden-${pendingAction === "stand" ? "stand" : "waiting"}`}
                >
                  <CardBack label={pendingAction === "stand" ? "Dealer is playing" : "Face-down card"} />
                </div>
              )
            ))}
          </div>
        </div>

        <div id="message" className="text-xl font-bold tracking-wide text-yellow-300 min-h-[32px] text-center" role={error ? "alert" : "status"}>
          {error || visibleMessage}
        </div>

        <div className="bg-emerald-800/60 p-4 rounded-xl w-full text-center border border-emerald-700/50 shadow-inner">
          <h2 className="text-lg font-semibold mb-2 text-emerald-200">
            Player <span id="player-score" className="text-xl font-semibold">
              {currentRound ? `(${currentRound.playerScore})` : ""}
            </span>
          </h2>
          <div id="player-cards" className="flex justify-center gap-2 min-h-[96px] items-center">
            {currentRound?.playerHand.map((card, index) => (
              <div className="w-16 h-24 bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center p-1 border border-slate-200 relative animate-deal-player" key={`player-${index}`}>
                <CardFace card={card} />
              </div>
            ))}
            {pendingAction === "hit" && (
              <div className="w-16 h-24 rounded-lg shadow-md overflow-hidden animate-deal-player pending-card">
                <CardBack label="Drawing a card" />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-emerald-950 p-4 shadow-lg border-t border-emerald-800">
        <div className="max-w-xl mx-auto w-full">
          {!active && !roundComplete && (
            <div id="betting-controls" className="flex gap-3">
              {[10, 50, 100].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => void runAction("start", amount)}
                  disabled={!ready || busy || balance < amount}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 font-semibold text-2xl py-4 rounded transition"
                >
                  ${amount}
                </button>
              ))}
            </div>
          )}
          {active && (
            <div id="game-controls" className="flex gap-3">
              <button id="hit-btn" type="button" onClick={() => void runAction("hit")} disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-500 font-semibold text-2xl py-4 rounded transition">{pendingAction === "hit" ? "Drawing…" : "Hit"}</button>
              <button id="stand-btn" type="button" onClick={() => void runAction("stand")} disabled={busy} className="flex-1 bg-red-600 hover:bg-red-500 font-semibold text-2xl py-4 rounded transition">{pendingAction === "stand" ? "Dealer playing…" : "Stand"}</button>
            </div>
          )}
          {roundComplete && (
            <button
              id="restart-btn"
              type="button"
              onClick={() => {
                setRound(null);
                setGameId(null);
                setMessage(balance > 0 ? "Place your bet to start" : "You're out of GC.");
              }}
              className="w-full bg-emerald-700 hover:bg-emerald-600 font-semibold text-2xl py-4 rounded transition"
            >
              Play Again
            </button>
          )}
        </div>
      </footer>
    </>
  );
}
