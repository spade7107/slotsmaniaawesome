import React from 'react';
import { X, Flame, Sparkles, Shield } from 'lucide-react';
import { SYMBOLS, SymbolId } from '../types/slot';
import { SymbolIcon } from './SymbolIcon';
import { CRUCIBLE_PAYOUT_SCALE } from '../utils/slotEngine';

interface PaytableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaytableModal: React.FC<PaytableModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const formatPayout = (amount: number) => `${(amount * CRUCIBLE_PAYOUT_SCALE).toFixed(3)}x`;

  const lowPaySymbols: SymbolId[] = [
    'RUNE_CLUB',
    'RUNE_DIAMOND',
    'RUNE_HEART',
    'RUNE_SPADE',
  ];

  const highPaySymbols: SymbolId[] = [
    'MORTAR',
    'SPELLBOOK',
    'POTION',
    'PHILOSOPHER_STONE',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel text-lg md:text-xl font-black text-amber-300 tracking-wider">
              Alchemical Grimoire · Rules & Paytable
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* Core Feature 1: Expanding Multiplier Wilds */}
          <section className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-red-950/20 to-slate-950 border border-amber-500/40">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-cinzel font-bold text-base">
              <Flame className="w-5 h-5 text-amber-500" />
              <h4>Expanding Multiplier Crucible Wilds</h4>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
              The <strong className="text-amber-300">Crucible Wild</strong> appears on{' '}
              <strong className="text-white">Reels 2, 3, and 4</strong> and substitutes for all
              symbols except the Scatter.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Full Reel Expansion:</strong> Whenever a
                Crucible Wild lands anywhere on a reel, it expands to cover all 3 rows of that
                reel.
              </li>
              <li>
                <strong className="text-slate-200">Multiplier Reveal:</strong> If it completes or
                participates in a winning combination, it reveals a random multiplier of{' '}
                <span className="text-amber-300 font-bold">2x</span>,{' '}
                <span className="text-amber-300 font-bold">3x</span>, or{' '}
                <span className="text-amber-300 font-bold">5x</span>!
              </li>
              <li>
                <strong className="text-slate-200">Multiplying Multipliers:</strong> If multiple
                Crucible Wilds participate in a winning line, their multipliers multiply together!
                (e.g., <span className="text-amber-300">2x × 3x = 6x Total Multiplier</span>).
              </li>
            </ul>
          </section>

          {/* Core Feature 2: Philosopher's Free Spins */}
          <section className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-teal-950/20 to-slate-950 border border-purple-500/40">
            <div className="flex items-center gap-2 mb-2 text-purple-300 font-cinzel font-bold text-base">
              <Shield className="w-5 h-5 text-teal-400" />
              <h4>Philosopher&apos;s Free Spins & Sticky Wilds</h4>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
              Landing <strong className="text-teal-300">3 or more Ouroboros Scatters</strong>{' '}
              anywhere on the reels triggers the bonus round and awards{' '}
              <strong className="text-amber-300 font-bold">10 Free Spins</strong>!
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Sticky Crucible Wilds:</strong> During Free
                Spins, any expanded Crucible Wild that lands locks in place and remains{' '}
                <span className="text-amber-300 font-bold">Sticky</span> on that reel for the
                entire duration of the bonus!
              </li>
              <li>
                <strong className="text-slate-200">Bonus Retrigger:</strong> Landing 3 or more
                Scatters during Free Spins awards{' '}
                <span className="text-teal-300 font-bold">+5 Extra Free Spins</span>!
              </li>
              <li>
                <strong className="text-slate-200">Scatter Payouts:</strong> 3 Scatters = 0.004x Total
                Bet, 4 Scatters = 0.020x Total Bet, 5 Scatters = 0.100x Total Bet.
              </li>
            </ul>
          </section>

          {/* High Pay Symbols */}
          <section>
            <h4 className="font-cinzel text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">
              High-Pay Symbols (Payouts per Line Bet)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highPaySymbols.map(symId => {
                const def = SYMBOLS[symId];
                return (
                  <div
                    key={symId}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      <SymbolIcon id={symId} />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-100 text-xs">{def.name}</h5>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">
                        {def.description}
                      </p>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        {def.payouts[2] && (
                          <span className="text-slate-400">
                            2x: <strong className="text-amber-300">{formatPayout(def.payouts[2])}</strong>
                          </span>
                        )}
                        <span className="text-slate-400">
                          3x: <strong className="text-amber-300">{formatPayout(def.payouts[3])}</strong>
                        </span>
                        <span className="text-slate-400">
                          4x: <strong className="text-amber-300">{formatPayout(def.payouts[4])}</strong>
                        </span>
                        <span className="text-slate-400">
                          5x: <strong className="text-amber-300">{formatPayout(def.payouts[5])}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Low Pay Symbols */}
          <section>
            <h4 className="font-cinzel text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
              Low-Pay Runic Stones (Card Suits)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lowPaySymbols.map(symId => {
                const def = SYMBOLS[symId];
                return (
                  <div
                    key={symId}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-14 h-14 flex items-center justify-center">
                      <SymbolIcon id={symId} />
                    </div>
                    <h5 className="font-bold text-slate-200 text-xs">{def.name}</h5>
                    <div className="flex flex-col gap-0.5 font-mono text-[11px] text-slate-400">
                      <span>
                        3x: <strong className="text-slate-200">{formatPayout(def.payouts[3])}</strong>
                      </span>
                      <span>
                        4x: <strong className="text-slate-200">{formatPayout(def.payouts[4])}</strong>
                      </span>
                      <span>
                        5x: <strong className="text-slate-200">{formatPayout(def.payouts[5])}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Payline Rules */}
          <section className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
            <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              General Payline Rules
            </h4>
            <p>
              • All 20 paylines are fixed and evaluated strictly from left to right starting on
              Reel 1.
              <br />
              • Only the highest win per payline is awarded. Simultaneous wins on different
              paylines are added together.
              <br />
              • Crucible Wilds appear only on Reels 2, 3, and 4.
              <br />
              • Free Spins are played at the same bet as the triggering round.
              <br />
              • Fractional-GC prizes are probabilistically rounded to whole GC.
            </p>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Back to Crucible
          </button>
        </div>
      </div>
    </div>
  );
};
