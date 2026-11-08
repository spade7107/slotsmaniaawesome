import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Zap,
  Info,
  History,
  RotateCcw,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HUDProps {
  balance: number;
  bet: number;
  lastWin: number;
  isSpinning: boolean;
  isAutoSpinning: boolean;
  autoSpinRemaining: number;
  turboMode: boolean;
  isFreeSpinsMode: boolean;
  freeSpinsRemaining: number;
  onSpin: () => void;
  onBetChange: (newBet: number) => void;
  onToggleAutoSpin: (count?: number) => void;
  onToggleTurbo: () => void;
  onOpenPaytable: () => void;
  onOpenHistory: () => void;
  onTogglePaylinesPreview: () => void;
  isPaylinesPreviewOpen: boolean;
  onResetBalance: () => void;
}

const BET_OPTIONS = [0.2, 0.4, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0];

export const HUD: React.FC<HUDProps> = ({
  balance,
  bet,
  lastWin,
  isSpinning,
  isAutoSpinning,
  autoSpinRemaining,
  turboMode,
  isFreeSpinsMode,
  freeSpinsRemaining,
  onSpin,
  onBetChange,
  onToggleAutoSpin,
  onToggleTurbo,
  onOpenPaytable,
  onOpenHistory,
  onTogglePaylinesPreview,
  isPaylinesPreviewOpen,
  onResetBalance,
}) => {
  const [isMuted, setIsMuted] = useState(soundFx.getMuted());
  const [showAutoOptions, setShowAutoOptions] = useState(false);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    soundFx.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundFx.playClick();
    }
  };

  const currentBetIndex = BET_OPTIONS.indexOf(bet);

  const handleDecreaseBet = () => {
    if (isSpinning || isFreeSpinsMode) return;
    soundFx.playClick();
    if (currentBetIndex > 0) {
      onBetChange(BET_OPTIONS[currentBetIndex - 1]);
    }
  };

  const handleIncreaseBet = () => {
    if (isSpinning || isFreeSpinsMode) return;
    soundFx.playClick();
    if (currentBetIndex < BET_OPTIONS.length - 1) {
      onBetChange(BET_OPTIONS[currentBetIndex + 1]);
    }
  };

  const handleMaxBet = () => {
    if (isSpinning || isFreeSpinsMode) return;
    soundFx.playClick();
    onBetChange(BET_OPTIONS[BET_OPTIONS.length - 1]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-3 sm:mt-4 p-2 sm:p-3 md:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-col gap-2 sm:gap-3">
      {/* Top HUD Row: Balance, Win, and Quick Utility Toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2.5 items-center">
        {/* Balance Display */}
        <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Balance
            </span>
            <span className="text-sm sm:text-base md:text-lg font-bold font-mono text-emerald-400">
              ${balance.toFixed(2)}
            </span>
          </div>
          {balance < 10 && (
            <button
              type="button"
              onClick={onResetBalance}
              title="Add Credits ($1,000)"
              className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-400/40 font-semibold transition-colors"
            >
              + Add
            </button>
          )}
        </div>

        {/* Win Display */}
        <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-800 flex flex-col justify-center">
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400">
            {isFreeSpinsMode ? 'Bonus Win' : 'Last Win'}
          </span>
          <span
            className={`text-sm sm:text-base md:text-lg font-bold font-mono transition-colors ${
              lastWin > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'
            }`}
          >
            ${lastWin.toFixed(2)}
          </span>
        </div>

        {/* Total Bet Selector */}
        <div className="col-span-2 md:col-span-1 bg-slate-950/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Total Bet (20 Lines)
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold font-mono text-amber-400">
              ${bet.toFixed(2)}{' '}
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal">
                (${(bet / 20).toFixed(2)}/ln)
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isSpinning || isFreeSpinsMode || currentBetIndex <= 0}
              onClick={handleDecreaseBet}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-xs sm:text-sm transition-colors"
            >
              -
            </button>
            <button
              type="button"
              disabled={isSpinning || isFreeSpinsMode || currentBetIndex >= BET_OPTIONS.length - 1}
              onClick={handleIncreaseBet}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-xs sm:text-sm transition-colors"
            >
              +
            </button>
            <button
              type="button"
              disabled={isSpinning || isFreeSpinsMode}
              onClick={handleMaxBet}
              className="px-1.5 h-6 sm:h-7 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold transition-colors uppercase"
            >
              Max
            </button>
          </div>
        </div>

        {/* Utility Controls */}
        <div className="col-span-2 md:col-span-1 bg-slate-950/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-slate-800 flex items-center justify-around">
          {/* Turbo Toggle */}
          <button
            type="button"
            onClick={onToggleTurbo}
            title={turboMode ? 'Turbo Spin Active' : 'Enable Turbo Spin'}
            className={`p-1.5 rounded-lg border transition-all ${
              turboMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className={`p-1.5 rounded-lg border transition-all ${
              !isMuted
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Paylines View Matrix Toggle */}
          <button
            type="button"
            onClick={onTogglePaylinesPreview}
            title="Inspect 20 Paylines Matrix"
            className={`p-1.5 rounded-lg border transition-all ${
              isPaylinesPreviewOpen
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Paytable & Rules Modal */}
          <button
            type="button"
            onClick={onOpenPaytable}
            title="Paytable & Rules"
            className="p-1.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Spin History Modal */}
          <button
            type="button"
            onClick={onOpenHistory}
            title="Spin History"
            className="p-1.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Action Row: Auto Spin, Spacebar Hint, and Giant Spin Button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Auto Spin Drawer Button */}
        <div className="relative">
          <button
            type="button"
            disabled={isSpinning || isFreeSpinsMode}
            onClick={() => {
              soundFx.playClick();
              if (isAutoSpinning) {
                onToggleAutoSpin(0);
              } else {
                setShowAutoOptions(!showAutoOptions);
              }
            }}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider border flex items-center gap-1.5 sm:gap-2 transition-all ${
              isAutoSpinning
                ? 'bg-rose-900/60 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <RotateCcw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isAutoSpinning ? 'animate-spin' : ''}`} />
            <span>
              {isAutoSpinning ? `Stop (${autoSpinRemaining})` : 'Auto'}
            </span>
          </button>

          {/* Auto Spin Counts Popup */}
          {showAutoOptions && !isAutoSpinning && (
            <div className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-1 z-50 min-w-32">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1">
                Spins Count
              </span>
              {[10, 25, 50, 100].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setShowAutoOptions(false);
                    onToggleAutoSpin(count);
                  }}
                  className="px-3 py-1.5 text-xs text-left font-mono font-bold text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg transition-colors"
                >
                  {count} Spins
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Spacebar shortcut prompt */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Press</span>
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300 shadow-inner">
            SPACE
          </kbd>
          <span>to Spin</span>
        </div>

        {/* Main Giant Spin Button */}
        <button
          type="button"
          disabled={isSpinning || balance < bet}
          onClick={() => {
            soundFx.playClick();
            onSpin();
          }}
          className={`relative px-6 sm:px-8 md:px-12 py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl font-cinzel font-black text-xs sm:text-sm md:text-base tracking-widest uppercase transition-all duration-200 shadow-xl flex items-center gap-2 sm:gap-2.5 overflow-hidden ${
            isFreeSpinsMode
              ? 'bg-gradient-to-r from-purple-600 via-amber-500 to-purple-600 hover:from-purple-500 hover:to-amber-400 text-slate-950 border-2 border-amber-300 shadow-[0_0_25px_rgba(234,179,8,0.5)] animate-pulse'
              : isSpinning
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95'
          }`}
        >
          {/* Shimmer light reflection */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
          <span>
            {isSpinning
              ? 'Spinning...'
              : isFreeSpinsMode
              ? `Free Spin (${freeSpinsRemaining})`
              : 'SPIN'}
          </span>
        </button>
      </div>
    </div>
  );
};
