import React, { useEffect, useRef, useState } from 'react';
import {
  CellPosition,
  ExpandedWildInfo,
  PAYLINES,
  SymbolId,
  WinningLine,
} from '../types/slot';
import { soundFx } from '../utils/audio';
import { SymbolIcon } from './SymbolIcon';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlotMachineProps {
  isSpinning: boolean;
  grid: SymbolId[][];
  expandedGrid: SymbolId[][];
  expandedWilds: Record<number, ExpandedWildInfo>;
  winningLines: WinningLine[];
  scatterPositions: CellPosition[];
  selectedPaylineIndex: number | null;
  isFreeSpinsMode: boolean;
  freeSpinsRemaining: number;
  totalFreeSpins: number;
  onSpinFinished: () => void;
  onLineSweepFinished: () => void;
  turboMode: boolean;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({
  isSpinning,
  grid,
  expandedGrid,
  expandedWilds,
  winningLines,
  scatterPositions,
  selectedPaylineIndex,
  isFreeSpinsMode,
  freeSpinsRemaining,
  totalFreeSpins,
  onSpinFinished,
  onLineSweepFinished,
  turboMode,
}) => {
  // Reel stop state
  const [reelStopped, setReelStopped] = useState<boolean[]>([true, true, true, true, true]);
  const [wildExpansionComplete, setWildExpansionComplete] = useState<boolean>(true);

  // Line showcase state (single pass through all lines, then clear and finish)
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [isLineSweepActive, setIsLineSweepActive] = useState<boolean>(false);

  // References to eliminate any stale closures in setTimeout callbacks
  const expandedWildsRef = useRef(expandedWilds);
  expandedWildsRef.current = expandedWilds;

  const onSpinFinishedRef = useRef(onSpinFinished);
  onSpinFinishedRef.current = onSpinFinished;

  const onLineSweepFinishedRef = useRef(onLineSweepFinished);
  onLineSweepFinishedRef.current = onLineSweepFinished;

  const gridRef = useRef(grid);
  gridRef.current = grid;

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const sweepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Spin execution & staggered reel stops
  useEffect(() => {
    if (!isSpinning) return;

    // Clear any previous active timers
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (sweepTimerRef.current) {
      clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }

    setReelStopped([false, false, false, false, false]);
    setWildExpansionComplete(false);
    setActiveLineIdx(null);
    setIsLineSweepActive(false);

    soundFx.playSpinStart();

    const baseDelay = turboMode ? 100 : 300;
    const interval = turboMode ? 90 : 220;

    // Reel 0 to 4 stop sequence
    for (let i = 0; i < 5; i++) {
      const delay = baseDelay + i * interval;
      const timer = setTimeout(() => {
        setReelStopped(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        soundFx.playReelStop(i);

        // Check scatter land sound
        const hasScatter = gridRef.current[i]?.some(s => s === 'OUROBOROS_SCATTER');
        if (hasScatter) {
          soundFx.playScatterLand(i + 1);
        }

        // When the final reel (4) stops
        if (i === 4) {
          const currentWilds = expandedWildsRef.current;
          const hasExpandingWild = Object.keys(currentWilds).length > 0;

          if (hasExpandingWild) {
            const wildExpandTimer = setTimeout(() => {
              soundFx.playCrucibleExpand();
              setWildExpansionComplete(true);

              // Reveal multipliers
              Object.values(currentWilds).forEach(info => {
                if (info) {
                  soundFx.playMultiplierReveal(info.multiplier);
                }
              });

              const finishTimer = setTimeout(() => {
                onSpinFinishedRef.current();
              }, turboMode ? 150 : 350);

              timeoutsRef.current.push(finishTimer);
            }, turboMode ? 120 : 250);

            timeoutsRef.current.push(wildExpandTimer);
          } else {
            setWildExpansionComplete(true);
            const finishTimer = setTimeout(() => {
              onSpinFinishedRef.current();
            }, turboMode ? 80 : 200);

            timeoutsRef.current.push(finishTimer);
          }
        }
      }, delay);

      timeoutsRef.current.push(timer);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [isSpinning, turboMode]);

  // Faster single-pass line sweep FIRST, then signal line sweep finished LAST (NO showing all lines ending)
  useEffect(() => {
    if (sweepTimerRef.current) {
      clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }

    if (isSpinning) {
      setActiveLineIdx(null);
      setIsLineSweepActive(false);
      return;
    }

    // If no winning lines, complete immediately
    if (winningLines.length === 0) {
      setActiveLineIdx(null);
      setIsLineSweepActive(false);
      const timer = setTimeout(() => {
        onLineSweepFinishedRef.current();
      }, 50);
      return () => clearTimeout(timer);
    }

    // If exactly 1 winning line
    if (winningLines.length === 1) {
      setActiveLineIdx(0);
      setIsLineSweepActive(false);
      const timer = setTimeout(() => {
        // Clear active line and notify that sweep is complete so win notification shows
        setActiveLineIdx(null);
        onLineSweepFinishedRef.current();
      }, turboMode ? 350 : 600);
      return () => clearTimeout(timer);
    }

    // Multiple winning lines: cycle through each line one by one first at fast speed
    setIsLineSweepActive(true);
    setActiveLineIdx(0);

    const stepSpeed = turboMode ? 220 : 380; // Fast snappy sweep per line
    let currentIdx = 0;

    const stepToNext = () => {
      currentIdx++;
      if (currentIdx < winningLines.length) {
        setActiveLineIdx(currentIdx);
        sweepTimerRef.current = setTimeout(stepToNext, stepSpeed);
      } else {
        // COMPLETED ALL LINES -> CLEAR LINE OVERLAY (NO SHOWING ALL LINES SPIDERWEB) AND SHOW WIN NOTIFICATION LAST!
        setIsLineSweepActive(false);
        setActiveLineIdx(null); // Clear line overlay completely!
        sweepTimerRef.current = null;
        // Trigger the win notification / Mega Win popup
        onLineSweepFinishedRef.current();
      }
    };

    sweepTimerRef.current = setTimeout(stepToNext, stepSpeed);

    return () => {
      if (sweepTimerRef.current) {
        clearTimeout(sweepTimerRef.current);
        sweepTimerRef.current = null;
      }
    };
  }, [isSpinning, winningLines, turboMode]);

  // Manual navigation handlers if user wants to inspect lines after the sweep
  const handlePrevLine = () => {
    soundFx.playClick();
    if (sweepTimerRef.current) {
      clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    setIsLineSweepActive(false);

    if (activeLineIdx === null || activeLineIdx <= 0) {
      setActiveLineIdx(winningLines.length - 1);
    } else {
      setActiveLineIdx(activeLineIdx - 1);
    }
  };

  const handleNextLine = () => {
    soundFx.playClick();
    if (sweepTimerRef.current) {
      clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    setIsLineSweepActive(false);

    if (activeLineIdx === null || activeLineIdx >= winningLines.length - 1) {
      setActiveLineIdx(0);
    } else {
      setActiveLineIdx(activeLineIdx + 1);
    }
  };

  const handleClearLineInspect = () => {
    soundFx.playClick();
    if (sweepTimerRef.current) {
      clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    setIsLineSweepActive(false);
    setActiveLineIdx(null);
  };

  // Determine which cells are part of a win
  const isCellWinning = (reel: number, row: number): boolean => {
    if (isSpinning || !wildExpansionComplete) return false;

    // External inspector line selected from matrix drawer
    if (selectedPaylineIndex !== null) {
      return PAYLINES[selectedPaylineIndex][reel] === row;
    }

    // When showing a specific winning line during sweep or manual inspect
    if (activeLineIdx !== null) {
      const activeLine = winningLines[activeLineIdx];
      if (activeLine) {
        return activeLine.positions.some(p => p.reel === reel && p.row === row);
      }
    }

    // When line sweep is done, keep winning cells highlighted gently without lines
    return winningLines.some(wl => wl.positions.some(p => p.reel === reel && p.row === row));
  };

  // Determine which cells are scatters
  const isScatterCell = (reel: number, row: number): boolean => {
    return scatterPositions.some(p => p.reel === reel && p.row === row);
  };

  // Active line data when a single line is active
  const currentActiveLine =
    activeLineIdx !== null ? winningLines[activeLineIdx] : null;

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 md:p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-600/40 shadow-2xl overflow-hidden">
      {/* Decorative Arcane Frame Corner Ornaments */}
      <div className="absolute top-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-amber-500/60 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-amber-500/60 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-amber-500/60 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-amber-500/60 rounded-br-lg pointer-events-none" />

      {/* Free Spins Header Banner */}
      {isFreeSpinsMode && (
        <div className="mb-2 sm:mb-3 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-950 via-amber-950 to-purple-950 border border-amber-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-cinzel text-[10px] sm:text-xs md:text-sm font-black tracking-widest text-amber-300 uppercase">
              Free Spins
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold">
            <span className="text-purple-300">
              Left:{' '}
              <strong className="text-amber-300 text-xs sm:text-sm font-bold font-mono">
                {freeSpinsRemaining}
              </strong>{' '}
              / {totalFreeSpins}
            </span>
            <span className="text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40 text-[10px] sm:text-xs hidden xs:inline">
              Sticky Wilds Active
            </span>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 sm:px-2 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/80 font-bold font-cinzel">
            5x3 Matrix
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-500">·</span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
            20 Lines
          </span>
        </div>

        {/* Win Status Banner */}
        {winningLines.length > 0 && !isSpinning && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* If a single line is currently highlighted */}
            {currentActiveLine ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] sm:text-xs font-bold animate-pulse">
                <span>Line #{currentActiveLine.lineIndex + 1}</span>
                <span>·</span>
                <span>{currentActiveLine.matchCount}x</span>
                {currentActiveLine.multiplier > 1 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-200 bg-amber-600/40 px-1 py-0.2 rounded font-mono">
                      {currentActiveLine.multiplier}X
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="text-amber-100 font-mono">
                  +${currentActiveLine.finalWin.toFixed(2)}
                </span>
                {winningLines.length > 1 && (
                  <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-mono">
                    ({(activeLineIdx || 0) + 1}/{winningLines.length})
                  </span>
                )}
              </div>
            ) : (
              /* Settled State after sweep finishes: Clean summary without any lines drawn */
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] sm:text-xs font-bold">
                <span>{winningLines.length} Winning Lines</span>
                {winningLines.some(wl => wl.multiplier > 1) && (
                  <>
                    <span>·</span>
                    <span className="text-amber-200 bg-amber-600/40 px-1.5 py-0.2 rounded font-mono">
                      Crucible Multipliers Active
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Line Stepper Controls */}
            {winningLines.length > 1 && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={handlePrevLine}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                  title="Previous line"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={activeLineIdx !== null ? handleClearLineInspect : () => setActiveLineIdx(0)}
                  className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 px-1 sm:px-1.5 min-w-10 sm:min-w-12 text-center hover:text-amber-300 transition-colors"
                  title={activeLineIdx !== null ? 'Hide line path' : 'Show line path'}
                >
                  {activeLineIdx !== null ? `${activeLineIdx + 1}/${winningLines.length}` : 'Inspect'}
                </button>

                <button
                  type="button"
                  onClick={handleNextLine}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                  title="Next line"
                >
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5-Reel Grid Container: responsive spacing and square cells */}
      <div className="relative grid grid-cols-5 gap-1 sm:gap-2 md:gap-2.5 p-1 sm:p-2 md:p-3 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
        {[0, 1, 2, 3, 4].map(reelIndex => {
          const isReelSpinning = isSpinning && !reelStopped[reelIndex];
          const isExpanded =
            wildExpansionComplete &&
            expandedWilds[reelIndex] !== undefined &&
            (expandedGrid[reelIndex]?.[0] === 'CRUCIBLE_WILD');
          const wildInfo = expandedWilds[reelIndex];

          return (
            <div
              key={reelIndex}
              className={`relative flex flex-col gap-1 sm:gap-2 rounded-lg sm:rounded-xl p-0.5 sm:p-1 transition-all duration-300 ${
                isExpanded
                  ? 'bg-amber-950/40 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-900/60 border border-slate-800/80'
              }`}
            >
              {/* Reel Column Label */}
              <div className="text-center text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 tracking-wider py-0.5">
                R{reelIndex + 1}
              </div>

              {/* 3 Visible Rows per Reel */}
              {[0, 1, 2].map(rowIndex => {
                const symbolToShow =
                  isExpanded && wildExpansionComplete
                    ? expandedGrid[reelIndex][rowIndex]
                    : grid[reelIndex]?.[rowIndex] || 'RUNE_CLUB';

                const winning = isCellWinning(reelIndex, rowIndex);
                const scatter = isScatterCell(reelIndex, rowIndex) && !isSpinning;

                return (
                  <div
                    key={rowIndex}
                    className={`relative w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center p-0.5 sm:p-1 transition-transform duration-300 overflow-hidden ${
                      winning
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] z-20'
                        : scatter
                        ? 'bg-teal-500/20 border-2 border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.5)] z-20'
                        : 'bg-slate-950/70 border border-slate-800/60'
                    }`}
                  >
                    {/* Spinning Blur Effect */}
                    {isReelSpinning ? (
                      <div className="w-full h-full flex flex-col items-center justify-around py-1 animate-pulse opacity-70">
                        <div className="w-3/4 h-1.5 sm:h-2 rounded bg-slate-800/80 filter blur-xs" />
                        <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-amber-500/30 filter blur-sm animate-spin" />
                        <div className="w-3/4 h-1.5 sm:h-2 rounded bg-slate-800/80 filter blur-xs" />
                      </div>
                    ) : (
                      <SymbolIcon
                        id={symbolToShow}
                        multiplier={wildInfo?.multiplier}
                        isWinning={winning}
                        isExpandedWild={isExpanded}
                        isSticky={isFreeSpinsMode && wildInfo?.isSticky}
                        size="md"
                      />
                    )}
                  </div>
                );
              })}

              {/* Expanded Reel Cauldron Overlay Effect */}
              {isExpanded && wildExpansionComplete && (
                <div className="absolute inset-0 rounded-lg sm:rounded-xl border-2 border-amber-400/80 pointer-events-none shadow-[inset_0_0_15px_rgba(245,158,11,0.3)] animate-pulse" />
              )}
            </div>
          );
        })}

        {/* SVG Payline Overlays: Only draw ONE active line during the sweep or when manually inspected. ZERO spiderweb at the end! */}
        {!isSpinning && (
          <>
            {/* If external payline inspector selected from matrix drawer */}
            {selectedPaylineIndex !== null ? (
              <PaylineSvgOverlay
                lineIndex={selectedPaylineIndex}
                isWinning={winningLines.some(wl => wl.lineIndex === selectedPaylineIndex)}
              />
            ) : currentActiveLine ? (
              /* Single active line during the fast sweep */
              <PaylineSvgOverlay
                lineIndex={currentActiveLine.lineIndex}
                isWinning={true}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

interface PaylineSvgOverlayProps {
  lineIndex: number;
  isWinning: boolean;
  opacity?: number;
}

const PaylineSvgOverlay: React.FC<PaylineSvgOverlayProps> = ({
  lineIndex,
  isWinning,
  opacity = 1,
}) => {
  const pattern = PAYLINES[lineIndex];
  if (!pattern) return null;

  const colX = [10, 30, 50, 70, 90];
  const rowY = [24, 54, 84];

  const points = pattern.map((row, col) => `${colX[col]},${rowY[row]}`).join(' ');

  const strokeColor = isWinning ? '#f59e0b' : '#38bdf8';
  const filterId = isWinning ? 'winGlow' : 'lineGlow';

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
      style={{ opacity }}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={strokeColor} floodOpacity="0.9" />
        </filter>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
        strokeDasharray={isWinning ? undefined : '3,2'}
      />
      {pattern.map((row, col) => (
        <circle
          key={col}
          cx={colX[col]}
          cy={rowY[row]}
          r={isWinning ? 2.5 : 1.8}
          fill={strokeColor}
          stroke="#0f172a"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
};
