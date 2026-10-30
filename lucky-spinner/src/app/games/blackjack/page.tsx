"use client";

import Link from "next/link";
import Image from "next/image";
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

const cardSuits: Record<Card["suit"], string> = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs",
};
const cardValues: Record<string, string> = { A: "ace", J: "jack", Q: "queen", K: "king" };

function cardImage(card: Card) {
  return `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardValues[card.value] ?? card.value.toLowerCase()}_of_${cardSuits[card.suit]}.png`;
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
        <p>Balance: $<span id="balance">{ready ? balance : "…"}</span></p>
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
                  <Image
                    unoptimized
                    width={64}
                    height={96}
                    src={cardImage(card)}
                    alt={`${card.value} of ${card.suit}`}
                    className="w-full h-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      const fallback = event.currentTarget.nextElementSibling;
                      if (fallback instanceof HTMLElement) fallback.style.display = "flex";
                    }}
                  />
                  <div className="absolute inset-0 hidden flex-col justify-between p-1 text-slate-900 font-bold text-xs select-none">
                    <span>{card.value}</span><span className="text-xl text-center">{card.suit}</span>
                    <span className="self-end rotate-180">{card.value}</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`w-16 h-24 bg-blue-900 border-2 border-blue-400 rounded-lg shadow-md flex items-center justify-center text-xl font-bold text-blue-300 animate-deal-dealer ${pendingAction === "stand" ? "pending-card" : ""}`}
                  key={`dealer-${index}-hidden-${pendingAction === "stand" ? "stand" : "waiting"}`}
                  role={pendingAction === "stand" ? "img" : undefined}
                  aria-label={pendingAction === "stand" ? "Dealer is playing" : undefined}
                >
                  🂠
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
                <Image
                  unoptimized
                  width={64}
                  height={96}
                  src={cardImage(card)}
                  alt={`${card.value} of ${card.suit}`}
                  className="w-full h-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    const fallback = event.currentTarget.nextElementSibling;
                    if (fallback instanceof HTMLElement) fallback.style.display = "flex";
                  }}
                />
                <div className="absolute inset-0 hidden flex-col justify-between p-1 text-slate-900 font-bold text-xs select-none">
                  <span>{card.value}</span><span className="text-xl text-center">{card.suit}</span>
                  <span className="self-end rotate-180">{card.value}</span>
                </div>
              </div>
            ))}
            {pendingAction === "hit" && (
              <div
                className="w-16 h-24 bg-blue-900 border-2 border-blue-400 rounded-lg shadow-md flex items-center justify-center text-xl font-bold text-blue-300 animate-deal-player pending-card"
                role="img"
                aria-label="Drawing a card"
              >
                🂠
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
                setMessage(balance > 0 ? "Place your bet to start" : "You're out of credits.");
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
