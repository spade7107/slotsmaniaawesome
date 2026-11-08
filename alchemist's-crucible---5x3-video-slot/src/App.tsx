/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CellPosition,
  ExpandedWildInfo,
  SpinHistoryItem,
  SpinResult,
  SymbolId,
  WinningLine,
} from './types/slot';
import { evaluateSpin } from './utils/slotEngine';
import { soundFx } from './utils/audio';
import { SlotMachine } from './components/SlotMachine';
import { HUD } from './components/HUD';
import { PaytableModal } from './components/PaytableModal';
import { SpinHistoryModal } from './components/SpinHistoryModal';
import { PaylinesPreview } from './components/PaylinesPreview';
import { BonusOverlay } from './components/BonusOverlay';
import { FeatureBuyTester } from './components/FeatureBuyTester';
import { Sparkles, BookOpen, Flame, Compass } from 'lucide-react';

// Initial decorative 5x3 grid showing theme symbols
const INITIAL_GRID: SymbolId[][] = [
  ['RUNE_CLUB', 'PHILOSOPHER_STONE', 'RUNE_DIAMOND'],
  ['POTION', 'CRUCIBLE_WILD', 'SPELLBOOK'],
  ['RUNE_HEART', 'CRUCIBLE_WILD', 'MORTAR'],
  ['SPELLBOOK', 'CRUCIBLE_WILD', 'POTION'],
  ['RUNE_SPADE', 'PHILOSOPHER_STONE', 'OUROBOROS_SCATTER'],
];

export default function App() {
  // Financial State
  const [balance, setBalance] = useState<number>(1000.0);
  const [bet, setBet] = useState<number>(2.0);
  const [lastWin, setLastWin] = useState<number>(0.0);

  // Machine Grid State
  const [grid, setGrid] = useState<SymbolId[][]>(INITIAL_GRID);
  const [expandedGrid, setExpandedGrid] = useState<SymbolId[][]>(INITIAL_GRID);
  const [expandedWilds, setExpandedWilds] = useState<Record<number, ExpandedWildInfo>>({});
  const [winningLines, setWinningLines] = useState<WinningLine[]>([]);
  const [scatterPositions, setScatterPositions] = useState<CellPosition[]>([]);

  // Spin Engine State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [turboMode, setTurboMode] = useState<boolean>(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState<number>(0);
  const currentSpinResultRef = useRef<SpinResult | null>(null);

  // Free Spins State
  const [isFreeSpinsMode, setIsFreeSpinsMode] = useState<boolean>(false);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState<number>(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState<number>(0);
  const [freeSpinsAccumulatedWin, setFreeSpinsAccumulatedWin] = useState<number>(0.0);
  const [stickyWilds, setStickyWilds] = useState<Record<number, ExpandedWildInfo>>({});

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

  // Helper: execute a single spin
  const executeSpin = useCallback(
    (forcedPreset?: 'scatters' | 'wilds' | 'mega_win') => {
      if (isSpinning) return;

      // When triggering manual test features, cancel active auto-spins
      if (forcedPreset) {
        setIsAutoSpinning(false);
        setAutoSpinRemaining(0);
      }

      // Balance check if base game
      if (!isFreeSpinsMode && balance < bet) {
        soundFx.playClick();
        return;
      }

      // Deduct bet if base game
      if (!isFreeSpinsMode) {
        setBalance(prev => Math.max(0, prev - bet));
      }

      setIsSpinning(true);
      setWinningLines([]);
      setLastWin(0);

      // Generate results using slot engine
      const result = evaluateSpin(
        bet,
        isFreeSpinsMode,
        isFreeSpinsMode ? stickyWilds : {},
        forcedPreset
      );
      currentSpinResultRef.current = result;

      // Set grid states
      setGrid(result.rawGrid);
      setExpandedGrid(result.expandedGrid);
      setExpandedWilds(result.expandedWilds);
      setScatterPositions(result.scatterPositions);
    },
    [isSpinning, isFreeSpinsMode, balance, bet, stickyWilds]
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
      setBalance(prev => prev + result.totalWin);
      soundFx.playLineWin(result.totalWin >= bet * 5);
    }

    // Free Spins mode bookkeeping
    if (isFreeSpinsMode) {
      setFreeSpinsAccumulatedWin(prev => prev + result.totalWin);

      // Any new expanded wild becomes sticky for remaining spins
      setStickyWilds(prev => {
        const next = { ...prev };
        Object.entries(result.expandedWilds).forEach(([reelStr, info]) => {
          const reel = Number(reelStr);
          if (!next[reel]) {
            next[reel] = { ...info, isSticky: true };
          }
        });
        return next;
      });

      const nextRemaining = freeSpinsRemaining - 1;
      setFreeSpinsRemaining(nextRemaining);

      // Check for retrigger (+5 Free Spins)
      if (result.isRetrigger) {
        soundFx.playFreeSpinsTrigger();
        setFreeSpinsRemaining(r => r + 5);
        setTotalFreeSpins(t => t + 5);
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
            totalWin: freeSpinsAccumulatedWin + result.totalWin,
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
      bet: isFreeSpinsMode ? 0 : bet,
      win: result.totalWin,
      isBonus: isFreeSpinsMode,
      expandedWildsCount: Object.keys(result.expandedWilds).length,
      multiplier: result.totalMultiplier,
      winningLinesCount: result.winningLines.length,
    };
    setHistory(prev => [historyItem, ...prev].slice(0, 50));

    // Auto-spin next round handler
    if (isAutoSpinning && autoSpinRemaining > 1 && !isFreeSpinsMode) {
      setAutoSpinRemaining(prev => prev - 1);
      setTimeout(() => {
        executeSpin();
      }, turboMode ? 350 : 700);
    } else if (isAutoSpinning && autoSpinRemaining <= 1) {
      setIsAutoSpinning(false);
      setAutoSpinRemaining(0);
    }
  }, [
    isFreeSpinsMode,
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
      setFreeSpinsRemaining(10);
      setTotalFreeSpins(10);
      setFreeSpinsAccumulatedWin(0);
      setStickyWilds({});
      setBonusOverlay({ type: null });
    } else if (bonusOverlay.type === 'summary') {
      setIsFreeSpinsMode(false);
      setStickyWilds({});
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
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
            Alchemist's Crucible
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
          isSpinning={isSpinning}
          isAutoSpinning={isAutoSpinning}
          autoSpinRemaining={autoSpinRemaining}
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
          onResetBalance={() => setBalance(1000.0)}
        />

        {/* Feature Demo & Instant Testing Bar */}
        <FeatureBuyTester
          isSpinning={isSpinning}
          isFreeSpinsMode={isFreeSpinsMode}
          onTriggerPreset={preset => executeSpin(preset)}
          onResetBalance={() => setBalance(1000.0)}
        />
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>Alchemist's Crucible Video Slot</span>
          <span aria-hidden="true">·</span>
          <span>5x3 Reels</span>
          <span aria-hidden="true">·</span>
          <span>20 Fixed Paylines</span>
          <span aria-hidden="true">·</span>
          <span>Expanding Multiplier Wilds (2x, 3x, 5x)</span>
          <span aria-hidden="true">·</span>
          <span>Philosopher's Free Spins with Sticky Wilds</span>
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
