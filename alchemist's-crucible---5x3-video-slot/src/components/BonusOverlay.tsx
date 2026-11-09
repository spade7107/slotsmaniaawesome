import React from 'react';
import { Sparkles, Trophy, Flame, Crown } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface BonusOverlayProps {
  type: 'trigger' | 'retrigger' | 'summary' | 'mega_win' | null;
  spinsAwarded?: number;
  totalWin?: number;
  multiplier?: number;
  onDismiss: () => void;
}

export const BonusOverlay: React.FC<BonusOverlayProps> = ({
  type,
  spinsAwarded = 10,
  totalWin = 0,
  multiplier = 1,
  onDismiss,
}) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg p-6 md:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-purple-950/60 to-slate-950 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center gap-5 overflow-hidden">
        {/* Arcane glow ring */}
        <div className="absolute inset-0 bg-radial from-amber-500/20 via-purple-500/10 to-transparent pointer-events-none animate-pulse" />

        {type === 'mega_win' && (
          <>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-rose-500 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.9)] animate-bounce">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Crown className="w-10 h-10 text-amber-300" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">
                Magnum Opus Transmutation
              </span>
              <h2 className="font-cinzel text-3xl md:text-4xl font-black text-amber-300 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                MEGA WIN!
              </h2>
              <div className="py-2 flex flex-col items-center">
                <span className="text-4xl md:text-6xl font-black font-mono text-emerald-300 drop-shadow-[0_0_25px_rgba(52,211,153,0.9)]">
                  ${totalWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {multiplier > 1 && (
                  <span className="mt-2 px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400 text-amber-200 font-mono text-xs font-bold">
                    {multiplier}X Crucible Multiplier
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                All 20 paylines formed 5-of-a-kind Philosopher's Stones!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onDismiss();
              }}
              className="mt-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-cinzel font-black text-sm tracking-widest uppercase shadow-xl transition-transform active:scale-95"
            >
              Collect Winnings
            </button>
          </>
        )}

        {type === 'trigger' && (
          <>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-amber-400 p-0.5 shadow-[0_0_30px_rgba(20,184,166,0.6)] animate-bounce">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-amber-300" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-widest text-teal-300 uppercase">
                Ouroboros Seal Activated
              </span>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wider">
                Philosopher's Free Spins!
              </h2>
              <div className="py-2">
                <span className="text-4xl md:text-5xl font-black font-cinzel text-white drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
                  {spinsAwarded} FREE SPINS
                </span>
              </div>
              <p className="text-xs md:text-sm text-purple-200/90 max-w-sm mx-auto leading-relaxed">
                During Free Spins, any expanded <strong className="text-amber-300">Crucible Wild</strong>{' '}
                becomes <strong className="text-amber-300">Sticky</strong> and stays locked in place for
                all remaining spins!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onDismiss();
              }}
              className="mt-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-cinzel font-black text-sm tracking-widest uppercase shadow-xl transition-transform active:scale-95"
            >
              Begin Transmutation
            </button>
          </>
        )}

        {type === 'retrigger' && (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-purple-500 p-0.5 shadow-[0_0_25px_rgba(168,85,247,0.7)] animate-pulse">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Flame className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                Alchemical Renewal
              </span>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-purple-300 uppercase tracking-wider">
                Bonus Retrigger!
              </h2>
              <div className="py-2">
                <span className="text-3xl md:text-4xl font-black font-cinzel text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                  +{spinsAwarded} Extra Free Spins
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onDismiss();
              }}
              className="mt-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-black text-xs tracking-widest uppercase shadow-lg transition-transform"
            >
              Continue Free Spins
            </button>
          </>
        )}

        {type === 'summary' && (
          <>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-[0_0_35px_rgba(234,179,8,0.7)] animate-bounce">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
                The Great Work Achieved
              </span>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wider">
                Bonus Round Complete
              </h2>
              <div className="py-2 flex flex-col items-center">
                <span className="text-xs uppercase text-slate-400 font-bold">Total Winnings</span>
                <span className="text-4xl md:text-5xl font-black font-mono text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
                  ${totalWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onDismiss();
              }}
              className="mt-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-cinzel font-black text-sm tracking-widest uppercase shadow-xl transition-transform active:scale-95"
            >
              Collect Winnings
            </button>
          </>
        )}
      </div>
    </div>
  );
};
