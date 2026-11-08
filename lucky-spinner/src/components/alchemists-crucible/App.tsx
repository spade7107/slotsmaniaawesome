/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  CellPosition,
  ExpandedWildInfo,
  SpinHistoryItem,
  SpinResult,
  SymbolId,
  WinningLine,
} from './types/slot';
import { SYMBOLS } from './types/slot';
import { soundFx } from './utils/audio';
import { SlotMachine } from './components/SlotMachine';
import { HUD } from './components/HUD';
import { PaytableModal } from './components/PaytableModal';
import { SpinHistoryModal } from './components/SpinHistoryModal';
import { PaylinesPreview } from './components/PaylinesPreview';
import { BonusOverlay } from './components/BonusOverlay';
import { BookOpen, Flame, Compass } from 'lucide-react';
import { useGameSession, type AlchemistsCrucibleBonusState } from '@/hooks/use-game-session';
import type { GameActionResponse } from '@/hooks/use-game-session';

// Initial decorative 5x3 grid showing theme symbols
const INITIAL_GRID: SymbolId[][] = [
  ['RUNE_CLUB', 'PHILOSOPHER_STONE', 'RUNE_DIAMOND'],
  ['POTION', 'CRUCIBLE_WILD', 'SPELLBOOK'],
  ['RUNE_HEART', 'CRUCIBLE_WILD', 'MORTAR'],
  ['SPELLBOOK', 'CRUCIBLE_WILD', 'POTION'],
  ['RUNE_SPADE', 'PHILOSOPHER_STONE', 'OUROBOROS_SCATTER'],
];

type CrucibleSpinResult = SpinResult & {
  isBonusSpin: boolean;
  bonusState: AlchemistsCrucibleBonusState | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSymbolId(value: unknown): value is SymbolId {
  return typeof value === 'string' && Object.hasOwn(SYMBOLS, value);
}

function isExpandedWildInfo(value: unknown): value is ExpandedWildInfo {
  return isRecord(value) &&
    Number.isInteger(value.reel) &&
    [2, 3, 5].includes(Number(value.multiplier)) &&
    (value.isSticky === undefined || typeof value.isSticky === 'boolean');
}

function isCellPosition(value: unknown): value is CellPosition {
  return isRecord(value) &&
    Number.isInteger(value.reel) && Number(value.reel) >= 0 && Number(value.reel) < 5 &&
    Number.isInteger(value.row) && Number(value.row) >= 0 && Number(value.row) < 3;
}

function parseCrucibleBonusState(value: unknown): AlchemistsCrucibleBonusState | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !Number.isInteger(value.version) ||
      !Number.isInteger(value.bet) || !Number.isInteger(value.spinsRemaining) ||
      !Number.isInteger(value.totalSpins) || !Number.isSafeInteger(value.accumulatedWin) ||
      (value.status !== 'active' && value.status !== 'complete') || !isRecord(value.stickyWilds)) {
    return null;
  }
  const stickyWilds: Record<number, ExpandedWildInfo> = {};
  for (const [reel, wild] of Object.entries(value.stickyWilds)) {
    if (!/^[1-3]$/.test(reel) || !isExpandedWildInfo(wild) || wild.reel !== Number(reel)) return null;
    stickyWilds[Number(reel)] = wild;
  }
  return {
    id: value.id,
    version: Number(value.version),
    bet: Number(value.bet),
    spinsRemaining: Number(value.spinsRemaining),
    totalSpins: Number(value.totalSpins),
    stickyWilds,
    accumulatedWin: Number(value.accumulatedWin),
    status: value.status,
  };
}

function parseCrucibleSpinResult(value: unknown): CrucibleSpinResult | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.rawGrid) ||
    !Array.isArray(value.expandedGrid) ||
    value.rawGrid.length !== 5 ||
    value.expandedGrid.length !== 5 ||
    !value.rawGrid.every((reel) => Array.isArray(reel) && reel.length === 3 && reel.every(isSymbolId)) ||
    !value.expandedGrid.every((reel) => Array.isArray(reel) && reel.length === 3 && reel.every(isSymbolId)) ||
    !isRecord(value.expandedWilds) ||
    !Array.isArray(value.winningLines) ||
    !Array.isArray(value.scatterPositions) ||
    !value.scatterPositions.every(isCellPosition) ||
    !Number.isSafeInteger(value.totalWin) ||
    !Number.isFinite(value.totalMultiplier) ||
    !Number.isInteger(value.scatterCount) ||
    !Number.isSafeInteger(value.scatterWin) ||
    typeof value.isFreeSpinsTriggered !== 'boolean' ||
    !Number.isInteger(value.freeSpinsAwarded) ||
    typeof value.isRetrigger !== 'boolean' ||
    typeof value.isBonusSpin !== 'boolean'
  ) {
    return null;
  }
  const bonusState = value.bonusState === undefined ? null : parseCrucibleBonusState(value.bonusState);
  if (value.bonusState !== undefined && !bonusState) return null;
  const expandedWilds: Record<number, ExpandedWildInfo> = {};
  for (const [reel, wild] of Object.entries(value.expandedWilds)) {
    if (!/^[1-3]$/.test(reel) || !isExpandedWildInfo(wild) || wild.reel !== Number(reel)) return null;
    expandedWilds[Number(reel)] = wild;
  }
  const winningLines: WinningLine[] = [];
  for (const line of value.winningLines) {
    if (!isRecord(line) || !Number.isInteger(line.lineIndex) || !isSymbolId(line.symbolId) ||
        !Number.isInteger(line.matchCount) || !Array.isArray(line.positions) ||
        !line.positions.every(isCellPosition) || !Number.isFinite(line.baseWin) ||
        !Number.isFinite(line.multiplier) || !Number.isSafeInteger(line.finalWin)) {
      return null;
    }
    winningLines.push({
      lineIndex: Number(line.lineIndex),
      symbolId: line.symbolId,
      matchCount: Number(line.matchCount),
      positions: line.positions,
      baseWin: Number(line.baseWin),
      multiplier: Number(line.multiplier),
      finalWin: Number(line.finalWin),
    });
  }
  return {
    rawGrid: value.rawGrid.map((reel) => reel as SymbolId[]),
    expandedGrid: value.expandedGrid.map((reel) => reel as SymbolId[]),
    expandedWilds,
    winningLines,
    totalWin: Number(value.totalWin),
    totalMultiplier: Number(value.totalMultiplier),
    scatterCount: Number(value.scatterCount),
    scatterPositions: value.scatterPositions,
    scatterWin: Number(value.scatterWin),
    isFreeSpinsTriggered: value.isFreeSpinsTriggered,
    freeSpinsAwarded: Number(value.freeSpinsAwarded),
    isRetrigger: value.isRetrigger,
    isBonusSpin: value.isBonusSpin,
    bonusState,
  };
}

export default function App() {
  const {
    balance,
    ready,
    error: sessionError,
    activeCrucibleBonus,
    act,
    refresh,
  } = useGameSession();
  // Financial State
  const [bet, setBet] = useState<number>(20.0);
  const [lastWin, setLastWin] = useState<number>(0.0);

  // Machine Grid State
  const [grid, setGrid] = useState<SymbolId[][]>(INITIAL_GRID);
  const [expandedGrid, setExpandedGrid] = useState<SymbolId[][]>(INITIAL_GRID);
  const [expandedWilds, setExpandedWilds] = useState<Record<number, ExpandedWildInfo>>({});
  const [winningLines, setWinningLines] = useState<WinningLine[]>([]);
  const [scatterPositions, setScatterPositions] = useState<CellPosition[]>([]);

  // Spin Engine State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isRequestingSpin, setIsRequestingSpin] = useState<boolean>(false);
  const [retryPendingSpin, setRetryPendingSpin] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [turboMode, setTurboMode] = useState<boolean>(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState<number>(0);
  const currentSpinResultRef = useRef<CrucibleSpinResult | null>(null);
  const pendingOperationIdRef = useRef<string | null>(null);

  // Free Spins State
  const [isFreeSpinsMode, setIsFreeSpinsMode] = useState<boolean>(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState<number>(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState<number>(0);
  const [freeSpinsAccumulatedWin, setFreeSpinsAccumulatedWin] = useState<number>(0.0);
  const [bonusStateRestored, setBonusStateRestored] = useState(false);

  // Modals & Overlays
  const [isPaytableOpen, setIsPaytableOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isPaylinesPreviewOpen, setIsPaylinesPreviewOpen] = useState<boolean>(false);
  const [selectedPaylineIndex, setSelectedPaylineIndex] = useState<number | null>(null);
  const [bonusOverlay, setBonusOverlay] = useState<{
    type: 'trigger' | 'retrigger' | 'summary' | 'mega_win' | null;
    spinsAwarded?: number;
    totalWin?: number;
    multiplier?: number;
  }>({ type: null });

  // Spin History
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);

  useEffect(() => {
    if (!ready || bonusStateRestored) return;
    const frame = requestAnimationFrame(() => {
      if (activeCrucibleBonus) {
        setBet(activeCrucibleBonus.bet);
        setIsFreeSpinsMode(true);
        setFreeSpinsRemaining(activeCrucibleBonus.spinsRemaining);
        setTotalFreeSpins(activeCrucibleBonus.totalSpins);
        setFreeSpinsAccumulatedWin(activeCrucibleBonus.accumulatedWin);
      }
      setBonusStateRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, bonusStateRestored, activeCrucibleBonus]);

  // Helper: resolve the spin and wallet update on the server before animating it.
  const executeSpin = useCallback(
    async () => {
      if (isSpinning || isRequestingSpin || !ready || !bonusStateRestored) return;
      if (!isFreeSpinsMode && balance < bet && !retryPendingSpin) {
        soundFx.playClick();
        return;
      }
      if (isFreeSpinsMode && !activeCrucibleBonus && !retryPendingSpin) return;

      setIsRequestingSpin(true);
      setActionError('');
      setWinningLines([]);
      setLastWin(0);

      const operationId = pendingOperationIdRef.current ?? crypto.randomUUID();
      pendingOperationIdRef.current = operationId;
      let response: GameActionResponse;
      try {
        response = await act(isFreeSpinsMode
          ? {
            game: 'alchemists-crucible',
            action: 'free-spin',
            operationId,
            bonusId: activeCrucibleBonus?.id,
            bonusVersion: activeCrucibleBonus?.version,
          }
          : { game: 'alchemists-crucible', action: 'spin', operationId, bet });
      } catch (spinError) {
        setActionError(spinError instanceof Error ? spinError.message : 'Could not complete the spin.');
        setIsRequestingSpin(false);
        setRetryPendingSpin(true);
        setIsAutoSpinning(false);
        setAutoSpinRemaining(0);
        try {
          await refresh();
        } catch (refreshError) {
          setActionError(
            `${spinError instanceof Error ? spinError.message : 'Could not complete the spin.'} `
            + (refreshError instanceof Error ? refreshError.message : 'Could not refresh your balance.'),
          );
        }
        return;
      }

      pendingOperationIdRef.current = null;
      setRetryPendingSpin(false);
      const result = parseCrucibleSpinResult(response.result);
      if (!result) {
        setActionError('The server returned an invalid Crucible spin result. Your balance has been refreshed.');
        setIsRequestingSpin(false);
        try {
          await refresh();
        } catch (refreshError) {
          setActionError(refreshError instanceof Error ? refreshError.message : 'Could not refresh your balance.');
        }
        return;
      }

      currentSpinResultRef.current = result;
      setGrid(result.rawGrid);
      setExpandedGrid(result.expandedGrid);
      setExpandedWilds(result.expandedWilds);
      setScatterPositions(result.scatterPositions);
      setIsRequestingSpin(false);
      setIsSpinning(true);
    },
    [
      isSpinning,
      isRequestingSpin,
      ready,
      bonusStateRestored,
      isFreeSpinsMode,
      balance,
      bet,
      retryPendingSpin,
      activeCrucibleBonus,
      act,
      refresh,
    ]
  );

  // Step 1: Called when reel animations finish. Sets winning lines so SlotMachine can sweep through each line first.
  const handleSpinFinished = useCallback(() => {
    const result = currentSpinResultRef.current;
    if (!result) {
      setIsSpinning(false);
      return;
    }

    setIsSpinning(false);
    setWinningLines(result.winningLines);
    // Notice: Do NOT display the win notification or credit balance yet! Lines must cycle first.
  }, []);

  // Step 2: Called after SlotMachine finishes cycling through each winning line (and after lines are cleared).
  // Shows the win notification / Mega Win popup LAST!
  const handleLineSweepFinished = useCallback(() => {
    const result = currentSpinResultRef.current;
    if (!result) return;
    currentSpinResultRef.current = null; // Mark handled

    setLastWin(result.totalWin);

    // Audio for win
    if (result.totalWin > 0) {
      soundFx.playLineWin(result.totalWin >= bet * 5);
    }

    // Free Spins mode bookkeeping
    if (result.isBonusSpin) {
      setFreeSpinsAccumulatedWin(prev => prev + result.totalWin);

      const nextRemaining = result.bonusState?.spinsRemaining ?? freeSpinsRemaining - 1;
      setFreeSpinsRemaining(nextRemaining);
      if (result.bonusState) {
        setTotalFreeSpins(result.bonusState.totalSpins);
      }

      // Check for retrigger (+5 Free Spins)
      if (result.isRetrigger) {
        soundFx.playFreeSpinsTrigger();
        setBonusOverlay({
          type: 'retrigger',
          spinsAwarded: 5,
        });
        return;
      }

      // Check if Free Spins bonus finished
      if (nextRemaining <= 0) {
        setTimeout(() => {
          setBonusOverlay({
            type: 'summary',
            totalWin: result.bonusState?.accumulatedWin ?? freeSpinsAccumulatedWin + result.totalWin,
          });
        }, 600);
        return;
      }
    } else {
      // Base game: check if Free Spins triggered (3+ Scatters)
      if (result.isFreeSpinsTriggered) {
        soundFx.playFreeSpinsTrigger();
        setIsAutoSpinning(false);
        setBonusOverlay({
          type: 'trigger',
          spinsAwarded: result.freeSpinsAwarded,
        });
        return;
      }

      // Check if Mega Win in Base Game (>= 25x bet). Shown LAST, after going through each line!
      if (result.totalWin >= bet * 25) {
        setBonusOverlay({
          type: 'mega_win',
          totalWin: result.totalWin,
          multiplier: result.totalMultiplier,
        });
      }
    }

    // Add to history log
    const historyItem: SpinHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      bet: result.isBonusSpin ? 0 : bet,
      win: result.totalWin,
      isBonus: result.isBonusSpin,
      expandedWildsCount: Object.keys(result.expandedWilds).length,
      multiplier: result.totalMultiplier,
      winningLinesCount: result.winningLines.length,
    };
    setHistory(prev => [historyItem, ...prev].slice(0, 50));

    // Auto-spin next round handler
    if (isAutoSpinning && autoSpinRemaining > 1 && !result.isBonusSpin) {
      setAutoSpinRemaining(prev => prev - 1);
      setTimeout(() => {
        executeSpin();
      }, turboMode ? 350 : 700);
    } else if (isAutoSpinning && autoSpinRemaining <= 1 && !result.isBonusSpin) {
      setIsAutoSpinning(false);
      setAutoSpinRemaining(0);
    }
  }, [
    freeSpinsRemaining,
    freeSpinsAccumulatedWin,
    bet,
    isAutoSpinning,
    autoSpinRemaining,
    turboMode,
    executeSpin,
  ]);

  // Handle Free Spins bonus dismissal & initialization
  const handleDismissBonusOverlay = () => {
    if (bonusOverlay.type === 'trigger') {
      setIsFreeSpinsMode(true);
      setFreeSpinsRemaining(activeCrucibleBonus?.spinsRemaining ?? 10);
      setTotalFreeSpins(activeCrucibleBonus?.totalSpins ?? 10);
      setFreeSpinsAccumulatedWin(activeCrucibleBonus?.accumulatedWin ?? 0);
      setBonusOverlay({ type: null });
    } else if (bonusOverlay.type === 'summary') {
      setIsFreeSpinsMode(false);
      setBonusOverlay({ type: null });
    } else {
      setBonusOverlay({ type: null });
    }
  };

  // Keyboard shortcut: Spacebar to spin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Prevent default spacebar scrolling
        e.preventDefault();
        if (!isSpinning && bonusOverlay.type === null && !isPaytableOpen && !isHistoryOpen) {
          executeSpin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeSpin, isSpinning, bonusOverlay, isPaytableOpen, isHistoryOpen]);

  // Auto spin loop during Free Spins
  useEffect(() => {
    if (isFreeSpinsMode && freeSpinsRemaining > 0 && !isSpinning && bonusOverlay.type === null) {
      const timer = setTimeout(() => {
        executeSpin();
      }, turboMode ? 500 : 1200);
      return () => clearTimeout(timer);
    }
  }, [isFreeSpinsMode, freeSpinsRemaining, isSpinning, bonusOverlay, turboMode, executeSpin]);

  return (
    <div className="alchemists-crucible-game min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. TOP BAR CONTRACT: 3 Zones (Wordmark, Nav Links, 1 Primary Action) */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark in display face */}
        <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            <div className="w-full h-full rounded-[6px] bg-slate-950 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </div>
          </div>
          <span className="font-cinzel text-sm sm:text-base md:text-lg font-black tracking-wider text-amber-300">
            Alchemist&apos;s Crucible
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => {
              setIsPaylinesPreviewOpen(!isPaylinesPreviewOpen);
              soundFx.playClick();
            }}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>20 Paylines</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPaytableOpen(true);
              soundFx.playClick();
            }}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Grimoire & Payouts</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsHistoryOpen(true);
              soundFx.playClick();
            }}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Transmutation Log
          </button>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 whitespace-nowrap shrink-0 font-mono text-[11px]">
            RTP 96.2%
          </span>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/dashboard"
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap"
          >
            All games
          </Link>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setIsPaytableOpen(true);
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold font-cinzel text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg sm:rounded-xl transition-all shadow-md whitespace-nowrap shrink-0 uppercase tracking-wider"
          >
            Paytable
          </button>
        </div>
      </header>

      {/* Main Crucible Arena */}
      <main className="flex-1 flex flex-col justify-center items-center px-1.5 sm:px-4 py-3 sm:py-6 md:py-8 max-w-6xl mx-auto w-full relative">
        <p className="w-full max-w-4xl mb-3 rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2 text-center text-xs text-amber-100/80">
          Spins and free-spin winnings are settled directly to your Slots Mania GC wallet.
        </p>
        {(sessionError || actionError) && (
          <p role="alert" className="mb-3 w-full max-w-4xl rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-center text-xs text-rose-200">
            {actionError || sessionError}
          </p>
        )}
        {/* Subtle Arcane Background Circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-amber-500/5 pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-teal-500/5 pointer-events-none -z-10" />

        {/* Interactive 20 Paylines Matrix Drawer (if toggled) */}
        {isPaylinesPreviewOpen && (
          <div className="w-full max-w-4xl mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <PaylinesPreview
              selectedLine={selectedPaylineIndex}
              onSelectLine={idx => setSelectedPaylineIndex(idx)}
            />
          </div>
        )}

        {/* 5x3 Reel Slot Machine */}
        <SlotMachine
          isSpinning={isSpinning}
          grid={grid}
          expandedGrid={expandedGrid}
          expandedWilds={expandedWilds}
          winningLines={winningLines}
          scatterPositions={scatterPositions}
          selectedPaylineIndex={selectedPaylineIndex}
          isFreeSpinsMode={isFreeSpinsMode}
          freeSpinsRemaining={freeSpinsRemaining}
          totalFreeSpins={totalFreeSpins}
          onSpinFinished={handleSpinFinished}
          onLineSweepFinished={handleLineSweepFinished}
          turboMode={turboMode}
        />

        {/* HUD Controls */}
        <HUD
          balance={balance}
          bet={bet}
          lastWin={lastWin}
          isSpinning={isSpinning || isRequestingSpin}
          isAutoSpinning={isAutoSpinning}
          autoSpinRemaining={autoSpinRemaining}
          isReady={ready && bonusStateRestored}
          isRetryPending={retryPendingSpin}
          turboMode={turboMode}
          isFreeSpinsMode={isFreeSpinsMode}
          freeSpinsRemaining={freeSpinsRemaining}
          onSpin={() => executeSpin()}
          onBetChange={newBet => setBet(newBet)}
          onToggleAutoSpin={count => {
            if (count && count > 0) {
              setIsAutoSpinning(true);
              setAutoSpinRemaining(count);
              executeSpin();
            } else {
              setIsAutoSpinning(false);
              setAutoSpinRemaining(0);
            }
          }}
          onToggleTurbo={() => setTurboMode(!turboMode)}
          onOpenPaytable={() => setIsPaytableOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onTogglePaylinesPreview={() => setIsPaylinesPreviewOpen(!isPaylinesPreviewOpen)}
          isPaylinesPreviewOpen={isPaylinesPreviewOpen}
        />

      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>Alchemist&apos;s Crucible Video Slot</span>
          <span aria-hidden="true">·</span>
          <span>5x3 Reels</span>
          <span aria-hidden="true">·</span>
          <span>20 Fixed Paylines</span>
          <span aria-hidden="true">·</span>
          <span>Expanding Multiplier Wilds (2x, 3x, 5x)</span>
          <span aria-hidden="true">·</span>
          <span>Philosopher&apos;s Free Spins with Sticky Wilds</span>
        </div>
      </footer>

      {/* Overlays & Modals */}
      <PaytableModal
        isOpen={isPaytableOpen}
        onClose={() => setIsPaytableOpen(false)}
      />

      <SpinHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={() => setHistory([])}
      />

      <BonusOverlay
        type={bonusOverlay.type}
        spinsAwarded={bonusOverlay.spinsAwarded}
        totalWin={bonusOverlay.totalWin}
        multiplier={bonusOverlay.multiplier}
        onDismiss={handleDismissBonusOverlay}
      />
    </div>
  );
}
