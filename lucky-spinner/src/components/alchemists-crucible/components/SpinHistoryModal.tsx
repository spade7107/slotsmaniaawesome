import React from 'react';
import { X, History } from 'lucide-react';
import { SpinHistoryItem } from '../types/slot';

interface SpinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SpinHistoryItem[];
  onClearHistory: () => void;
}

export const SpinHistoryModal: React.FC<SpinHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel text-lg font-black text-amber-300 tracking-wider">
              Spin History & Transmutations
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No spins recorded yet. Spin the reels to begin your alchemical log!
            </div>
          ) : (
            history.map(item => {
              const isProfit = item.win > item.bet;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs md:text-sm ${
                    item.isBonus
                      ? 'bg-purple-950/40 border-purple-500/50'
                      : isProfit
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      {item.isBonus && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-600/30 text-purple-300 border border-purple-400/40">
                          Free Spin
                        </span>
                      )}
                      {item.expandedWildsCount > 0 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-600/30 text-amber-300 border border-amber-400/40">
                          {item.expandedWildsCount} Wild{item.expandedWildsCount > 1 ? 's' : ''} (
                          {item.multiplier}x)
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs">
                      Bet: <strong className="text-slate-200 font-mono">{item.bet.toLocaleString('en-US')} GC</strong> ·{' '}
                      {item.winningLinesCount} winning line{item.winningLinesCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payout</span>
                    <span
                      className={`font-mono font-bold text-sm md:text-base ${
                        item.win > 0 ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {item.win.toLocaleString('en-US')} GC
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear History
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
