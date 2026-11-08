import React from 'react';
import { SymbolId } from '../types/slot';

interface SymbolIconProps {
  id: SymbolId;
  multiplier?: 2 | 3 | 5;
  isWinning?: boolean;
  isExpandedWild?: boolean;
  isSticky?: boolean;
}

export const SymbolIcon: React.FC<SymbolIconProps> = ({
  id,
  multiplier,
  isWinning = false,
  isExpandedWild = false,
  isSticky = false,
}) => {
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none transition-transform duration-200 ${
        isWinning ? 'scale-[1.03] z-10' : ''
      }`}
    >
      {/* Background win glow */}
      {isWinning && (
        <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-amber-400/25 blur-sm sm:blur-md animate-pulse pointer-events-none" />
      )}

      {/* Render Symbol Graphic */}
      {renderSymbolGraphic(id)}

      {/* Wild Multiplier Overlay if expanded */}
      {(id === 'CRUCIBLE_WILD' || isExpandedWild) && multiplier && (
        <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 z-20">
          <div
            className={`px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded font-black text-[9px] sm:text-xs shadow-md tracking-wider border flex items-center gap-0.5 ${
              multiplier === 5
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-amber-200 animate-pulse'
                : multiplier === 3
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 border-amber-300'
                : 'bg-gradient-to-r from-amber-700 to-amber-500 text-white border-amber-400'
            }`}
          >
            <span>{multiplier}X</span>
          </div>
        </div>
      )}

      {/* Free Spins Sticky Wild Badge */}
      {isSticky && (
        <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 px-1 py-0.2 rounded text-[7px] sm:text-[9px] font-black uppercase tracking-wider bg-purple-900/90 text-amber-300 border border-amber-400/40 shadow">
          Sticky
        </div>
      )}
    </div>
  );
};

function renderSymbolGraphic(id: SymbolId) {
  switch (id) {
    case 'RUNE_CLUB':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-emerald-500/30 shadow-inner flex items-center justify-center overflow-hidden p-1 sm:p-1.5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:6px_6px]" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]">
              <defs>
                <linearGradient id="emeraldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="43" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
              <circle cx="50" cy="36" r="14" fill="url(#emeraldGlow)" />
              <circle cx="36" cy="52" r="14" fill="url(#emeraldGlow)" />
              <circle cx="64" cy="52" r="14" fill="url(#emeraldGlow)" />
              <path d="M47 52 L53 52 L57 78 L43 78 Z" fill="url(#emeraldGlow)" />
              <circle cx="50" cy="46" r="4" fill="#ecfdf5" />
            </svg>
          </div>
        </div>
      );

    case 'RUNE_DIAMOND':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 shadow-inner flex items-center justify-center overflow-hidden p-1 sm:p-1.5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px]" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
              <defs>
                <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <polygon points="50,12 85,50 50,88 15,50" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <polygon points="50,22 76,50 50,78 24,50" fill="url(#amberGlow)" />
              <polygon points="50,34 62,50 50,66 38,50" fill="#fef08a" opacity="0.8" />
            </svg>
          </div>
        </div>
      );

    case 'RUNE_HEART':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-red-500/30 shadow-inner flex items-center justify-center overflow-hidden p-1 sm:p-1.5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:6px_6px]" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
              <defs>
                <linearGradient id="rubyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>
              <path
                d="M50 82 C50 82 20 62 20 38 C20 25 30 18 40 22 C46 25 50 32 50 32 C50 32 54 25 60 22 C70 18 80 25 80 38 C80 62 50 82 50 82 Z"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.5"
              />
              <path
                d="M50 74 C50 74 26 56 26 39 C26 28 34 23 42 26 C47 28 50 34 50 34 C50 34 53 28 58 26 C66 23 74 28 74 39 C74 56 50 74 50 74 Z"
                fill="url(#rubyGlow)"
              />
              <circle cx="50" cy="45" r="3.5" fill="#fef2f2" />
            </svg>
          </div>
        </div>
      );

    case 'RUNE_SPADE':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-purple-500/30 shadow-inner flex items-center justify-center overflow-hidden p-1 sm:p-1.5">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:6px_6px]" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">
              <defs>
                <linearGradient id="violetGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
              </defs>
              <path
                d="M50 16 C50 16 22 45 22 60 C22 72 32 78 44 72 C46 71 48 68 50 64 C52 68 54 71 56 72 C68 78 78 72 78 60 C78 45 50 16 50 16 Z"
                fill="url(#violetGlow)"
              />
              <path d="M47 66 L53 66 L57 84 L43 84 Z" fill="url(#violetGlow)" />
              <circle cx="50" cy="46" r="3.5" fill="#faf5ff" />
            </svg>
          </div>
        </div>
      );

    case 'MORTAR':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800/90 to-sky-950/50 border border-sky-500/40 shadow-inner flex items-center justify-center p-1 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_5px_rgba(56,189,248,0.6)]">
              <defs>
                <linearGradient id="bronzeBowl" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="50%" stopColor="#78350f" />
                  <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
                <linearGradient id="marblePestle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="herbGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path d="M22 46 C22 75 34 85 50 85 C66 85 78 75 78 46 L82 42 L18 42 Z" fill="url(#bronzeBowl)" stroke="#ca8a04" strokeWidth="2" />
              <ellipse cx="50" cy="42" rx="32" ry="7" fill="#b45309" stroke="#fde047" strokeWidth="1" />
              <ellipse cx="50" cy="43" rx="24" ry="5" fill="url(#herbGlow)" />
              <path d="M58 20 L76 12 L70 48 L54 52 Z" fill="url(#marblePestle)" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="44" cy="30" r="2.5" fill="#38bdf8" className="animate-ping" />
              <circle cx="56" cy="24" r="2" fill="#fef08a" />
            </svg>
          </div>
        </div>
      );

    case 'SPELLBOOK':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800/90 to-amber-950/50 border border-amber-500/40 shadow-inner flex items-center justify-center p-1 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]">
              <defs>
                <linearGradient id="leatherBook" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9a3412" />
                  <stop offset="100%" stopColor="#431407" />
                </linearGradient>
                <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              <rect x="22" y="18" width="56" height="66" rx="4" fill="url(#leatherBook)" stroke="#b45309" strokeWidth="2" />
              <rect x="18" y="17" width="8" height="68" rx="2" fill="#7c2d12" stroke="#f59e0b" strokeWidth="1" />
              <polygon points="22,18 36,18 22,32" fill="url(#goldFiligree)" />
              <polygon points="78,18 64,18 78,32" fill="url(#goldFiligree)" />
              <polygon points="22,84 36,84 22,70" fill="url(#goldFiligree)" />
              <polygon points="78,84 64,84 78,70" fill="url(#goldFiligree)" />
              <circle cx="50" cy="51" r="14" fill="none" stroke="url(#goldFiligree)" strokeWidth="2" />
              <polygon points="50,40 54,48 62,51 54,54 50,62 46,54 38,51 46,48" fill="#fef08a" />
              <path d="M48 84 L48 94 L53 90 L58 94 L58 84 Z" fill="#ef4444" />
            </svg>
          </div>
        </div>
      );

    case 'POTION':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-slate-800/90 to-purple-950/50 border border-purple-500/40 shadow-inner flex items-center justify-center p-1 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(192,132,252,0.7)]">
              <defs>
                <linearGradient id="liquidElixir" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="70%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
                <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect x="42" y="14" width="16" height="8" rx="2" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
              <rect x="45" y="22" width="10" height="16" fill="#38bdf8" fillOpacity="0.25" stroke="#bae6fd" strokeWidth="1" />
              <ellipse cx="50" cy="22" rx="7" ry="2" fill="#bae6fd" />
              <circle cx="50" cy="62" r="28" fill="#1e1b4b" fillOpacity="0.5" stroke="#bae6fd" strokeWidth="2" />
              <path d="M25 64 C25 78 36 88 50 88 C64 88 75 78 75 64 C75 60 70 56 62 56 C54 56 46 58 38 56 C30 56 25 60 25 64 Z" fill="url(#liquidElixir)" />
              <circle cx="44" cy="74" r="3" fill="#f3e8ff" opacity="0.9" />
              <circle cx="56" cy="68" r="2" fill="#f3e8ff" opacity="0.9" />
              <circle cx="50" cy="80" r="1.5" fill="#f3e8ff" opacity="0.9" />
              <path d="M30 54 A24 24 0 0 1 50 40" stroke="url(#glassReflection)" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
      );

    case 'PHILOSOPHER_STONE':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-950/50 via-red-950/50 to-slate-900 border-2 border-amber-400 shadow-[0_0_12px_rgba(234,179,8,0.5)] flex items-center justify-center p-1 overflow-hidden">
            <div className="absolute inset-0 bg-radial from-amber-500/25 via-transparent to-transparent animate-pulse" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
              <defs>
                <linearGradient id="stoneFacet1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="stoneFacet2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="goldProngs" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="43" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
              <circle cx="50" cy="50" r="32" fill="none" stroke="url(#goldProngs)" strokeWidth="2.5" />
              <polygon points="50,18 78,38 78,68 50,86 22,68 22,38" fill="url(#stoneFacet2)" stroke="#fde047" strokeWidth="1.5" />
              <polygon points="50,18 78,38 50,52 22,38" fill="url(#stoneFacet1)" />
              <polygon points="50,52 78,38 78,68" fill="#b91c1c" />
              <polygon points="50,52 22,38 22,68" fill="#7f1d1d" />
              <polygon points="50,52 78,68 50,86" fill="url(#stoneFacet1)" opacity="0.8" />
              <polygon points="50,52 22,68 50,86" fill="#991b1b" />
              <circle cx="50" cy="52" r="5" fill="#fef08a" className="animate-pulse" />
            </svg>
          </div>
        </div>
      );

    case 'CRUCIBLE_WILD':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-900/70 via-red-950/70 to-slate-950 border-2 border-amber-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] flex items-center justify-center p-0.5 sm:p-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/30 via-amber-500/10 to-transparent animate-pulse" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
              <defs>
                <linearGradient id="crucibleBody" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="40%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="moltenGold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="flameFire" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fde047" />
                </linearGradient>
              </defs>
              <path d="M26 72 L18 88 L26 88" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M74 72 L82 88 L74 88" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M50 78 L50 90" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M30 84 Q40 68 50 82 Q60 68 70 84 Z" fill="url(#flameFire)" opacity="0.85" />
              <ellipse cx="50" cy="38" rx="34" ry="10" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
              <path d="M16 38 C16 70 28 78 50 78 C72 78 84 70 84 38 Z" fill="url(#crucibleBody)" stroke="#f59e0b" strokeWidth="2" />
              <path d="M20 52 C30 58 70 58 80 52" stroke="#fde047" strokeWidth="2" fill="none" />
              <circle cx="50" cy="62" r="6" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
              <ellipse cx="50" cy="38" rx="28" ry="7" fill="url(#moltenGold)" />
              <path d="M42 34 Q45 22 40 14" stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M52 34 Q56 20 52 12" stroke="#fde047" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9" />
              <path d="M60 34 Q64 24 58 16" stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
            </svg>
            {/* Top label banner */}
            <div className="absolute top-0.5 inset-x-1 sm:inset-x-2 text-center text-[7px] sm:text-[9px] font-black tracking-widest text-amber-300 uppercase bg-black/70 rounded py-0.2 sm:py-0.5 border border-amber-500/40">
              WILD
            </div>
          </div>
        </div>
      );

    case 'OUROBOROS_SCATTER':
      return (
        <div className="w-full h-full p-0.5 sm:p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded-lg sm:rounded-xl bg-gradient-to-b from-teal-950/70 via-slate-900 to-slate-950 border-2 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.6)] flex items-center justify-center p-0.5 sm:p-1 overflow-hidden">
            <div className="absolute inset-0 bg-radial from-teal-400/25 via-transparent to-transparent animate-pulse" />
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]">
              <defs>
                <linearGradient id="serpentGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#14b8a6" />
                  <stop offset="80%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="43" fill="none" stroke="#2dd4bf" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
              <circle cx="50" cy="50" r="32" fill="none" stroke="url(#serpentGold)" strokeWidth="8" strokeLinecap="round" />
              <circle cx="50" cy="18" r="7" fill="#fde047" stroke="#0f766e" strokeWidth="1.5" />
              <circle cx="48" cy="16" r="1.5" fill="#ef4444" />
              <polygon points="50,30 54,44 68,44 56,52 61,66 50,58 39,66 44,52 32,44 46,44" fill="#2dd4bf" opacity="0.9" />
              <circle cx="50" cy="50" r="3" fill="#fef08a" />
            </svg>
            <div className="absolute bottom-0.5 inset-x-1 sm:inset-x-2 text-center text-[7px] sm:text-[9px] font-black tracking-widest text-teal-200 uppercase bg-black/75 rounded py-0.2 sm:py-0.5 border border-teal-500/40">
              SCATTER
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
