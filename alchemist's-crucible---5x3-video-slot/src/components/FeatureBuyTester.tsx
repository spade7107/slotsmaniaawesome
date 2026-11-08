import React from 'react';
import { Sparkles, Flame, Shield, RefreshCw } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface FeatureBuyTesterProps {
  isSpinning: boolean;
  isFreeSpinsMode: boolean;
  onTriggerPreset: (preset: 'scatters' | 'wilds' | 'mega_win') => void;
  onResetBalance: () => void;
}

export const FeatureBuyTester: React.FC<FeatureBuyTesterProps> = ({
  isSpinning,
  isFreeSpinsMode,
  onTriggerPreset,
  onResetBalance,
}) => {
  const isBusy = isSpinning || isFreeSpinsMode;

  return (
    <div className="w-full max-w-4xl mx-auto mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
      <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
        <span className="font-semibold text-slate-300">Feature Demo & Testing:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Trigger Free Spins (3 Scatters) */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            soundFx.playClick();
            onTriggerPreset('scatters');
          }}
          className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-500/50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 font-medium"
        >
          <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Test Free Spins</span>
        </button>

        {/* Trigger Expanding Multiplier Wilds */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            soundFx.playClick();
            onTriggerPreset('wilds');
          }}
          className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 font-medium"
        >
          <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Test Wilds</span>
        </button>

        {/* Test Mega Win */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            soundFx.playClick();
            onTriggerPreset('mega_win');
          }}
          className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 font-medium"
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Test Mega Win</span>
        </button>

        {/* Reset Balance */}
        <button
          type="button"
          disabled={isSpinning}
          onClick={() => {
            soundFx.playClick();
            onResetBalance();
          }}
          className="px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 font-medium"
          title="Reset balance to $1,000.00"
        >
          <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Reset $1k</span>
        </button>
      </div>
    </div>
  );
};
