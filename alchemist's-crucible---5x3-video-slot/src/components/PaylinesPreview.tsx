import React, { useState } from 'react';
import { PAYLINES } from '../types/slot';

interface PaylinesPreviewProps {
  onSelectLine?: (lineIndex: number | null) => void;
  selectedLine?: number | null;
}

export const PaylinesPreview: React.FC<PaylinesPreviewProps> = ({
  onSelectLine,
  selectedLine,
}) => {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const activeLine = selectedLine !== undefined ? selectedLine : hoveredLine;

  const handleLineClick = (idx: number) => {
    if (onSelectLine) {
      onSelectLine(selectedLine === idx ? null : idx);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          20 Fixed Paylines Matrix
        </h4>
        <span className="text-[11px] text-slate-400">
          Left-to-Right · Wins start on Reel 1
        </span>
      </div>

      {/* Grid of 20 miniature payline previews */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
        {PAYLINES.map((pattern, idx) => {
          const isSelected = activeLine === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleLineClick(idx)}
              onMouseEnter={() => setHoveredLine(idx)}
              onMouseLeave={() => setHoveredLine(null)}
              className={`p-1.5 rounded-lg border transition-all text-left flex flex-col items-center gap-1 ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-300">
                  #{idx + 1}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              </div>

              {/* 5x3 Mini Dot Matrix */}
              <div className="grid grid-cols-5 gap-0.5 w-full bg-slate-900 p-1 rounded border border-slate-800/80">
                {[0, 1, 2].map(row => (
                  <React.Fragment key={row}>
                    {[0, 1, 2, 3, 4].map(reel => {
                      const isActivePoint = pattern[reel] === row;
                      return (
                        <div
                          key={`${reel}-${row}`}
                          className={`h-1.5 rounded-sm transition-colors ${
                            isActivePoint
                              ? isSelected
                                ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b]'
                                : 'bg-amber-500'
                              : 'bg-slate-800'
                          }`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
