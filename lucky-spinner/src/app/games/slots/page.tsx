"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ActiveBoostStatus } from "@/components/active-boost-status";
import { useGameSession } from "@/hooks/use-game-session";

const symbols = ["🍒", "🍋", "🔔", "⭐", "7️⃣"];

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

export default function SlotsPage() {
  const { balance, ready, error, activeBoost, act } = useGameSession();
  const [grid, setGrid] = useState(() => Array.from({ length: 9 }, (_, index) => symbols[index % symbols.length]));
  const [message, setMessage] = useState("");
  const [spinning, setSpinning] = useState(false);
  const operationId = useRef<string | null>(null);

  const spin = async () => {
    if (spinning || !ready || balance < 10) return;
    setSpinning(true);
    setMessage("Spinning... 🎰");
    const requestId = operationId.current ?? crypto.randomUUID();
    operationId.current = requestId;

    let response: Awaited<ReturnType<typeof act>>;
    try {
      response = await act({ game: "slots", operationId: requestId });
      operationId.current = null;
    } catch {
      setMessage("Could not complete the spin.");
      setSpinning(false);
      return;
    }

    const finalGrid = response.result?.grid;
    if (
      !Array.isArray(finalGrid) ||
      finalGrid.length !== 3 ||
      !finalGrid.every((row) => Array.isArray(row) && row.length === 3)
    ) {
      setMessage("The server returned an invalid slot result.");
      setSpinning(false);
      return;
    }
    let ticks = 0;
    const timer = window.setInterval(() => {
      setGrid(Array.from({ length: 9 }, randomSymbol));
      ticks += 1;
      if (ticks >= 30) {
        window.clearInterval(timer);
        setGrid(finalGrid.flat() as string[]);
        const wins = Number(response.result?.winningLines ?? 0);
        const payout = Number(response.result?.payout ?? 0);
        setMessage(response.result?.boostApplied
          ? `BOOSTED WIN! ${wins} winning line(s)! (+$${payout})`
          : wins > 0
            ? `WIN! ${wins} winning line(s)! (+$${payout})`
            : "Try again!");
        setSpinning(false);
      }
    }, 60);
  };

  return (
    <>
      <div className="home">
        <Link href="/">Home</Link>
      </div>
      <div className="stats">
        Balance: $<span id="balance">{ready ? balance : "…"}</span>
      </div>
      <div className="mx-auto mb-4 w-full max-w-[500px] px-4">
        <ActiveBoostStatus boost={activeBoost} />
      </div>
      <main className="casino-container">
        <h1>3x3 Slot Machine</h1>
        <div className="slots-window">
          {grid.map((symbol, index) => (
            <div className="reel" id={`r${Math.floor(index / 3)}c${index % 3}`} key={index}>
              {symbol}
            </div>
          ))}
        </div>
        <button id="spinBtn" type="button" onClick={() => void spin()} disabled={spinning || !ready || balance < 10}>
          {spinning ? "SPINNING…" : "SPIN ($10)"}
        </button>
        <div id="message" role={error ? "alert" : "status"}>{error || message}</div>
      </main>
    </>
  );
}
