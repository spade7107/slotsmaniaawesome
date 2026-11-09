/**
 * Alchemist's Crucible Slot Machine - Types & Constants
 */

export type SymbolId =
  | 'RUNE_CLUB'
  | 'RUNE_DIAMOND'
  | 'RUNE_HEART'
  | 'RUNE_SPADE'
  | 'MORTAR'
  | 'SPELLBOOK'
  | 'POTION'
  | 'PHILOSOPHER_STONE'
  | 'CRUCIBLE_WILD'
  | 'OUROBOROS_SCATTER';

export interface SymbolDefinition {
  id: SymbolId;
  name: string;
  category: 'low' | 'high' | 'wild' | 'scatter';
  payouts: Record<number, number>; // match count (3, 4, 5) -> line bet multiplier
  description: string;
  accentColor: string;
}

export const SYMBOLS: Record<SymbolId, SymbolDefinition> = {
  RUNE_CLUB: {
    id: 'RUNE_CLUB',
    name: 'Verdant Club Rune',
    category: 'low',
    payouts: { 3: 4, 4: 12, 5: 36 },
    description: 'Emerald runic stone carved with natural transmutation glyphs',
    accentColor: '#10b981',
  },
  RUNE_DIAMOND: {
    id: 'RUNE_DIAMOND',
    name: 'Citrine Diamond Rune',
    category: 'low',
    payouts: { 3: 4, 4: 14, 5: 43 },
    description: 'Amber stone etched with crystallization sigils',
    accentColor: '#f59e0b',
  },
  RUNE_HEART: {
    id: 'RUNE_HEART',
    name: 'Ruby Heart Rune',
    category: 'low',
    payouts: { 3: 7, 4: 18, 5: 55 },
    description: 'Crimson stone thrumming with vital essence',
    accentColor: '#ef4444',
  },
  RUNE_SPADE: {
    id: 'RUNE_SPADE',
    name: 'Amethyst Spade Rune',
    category: 'low',
    payouts: { 3: 8, 4: 23, 5: 72 },
    description: 'Deep violet stone inscribed with shadow distillation glyphs',
    accentColor: '#a855f7',
  },
  MORTAR: {
    id: 'MORTAR',
    name: 'Mortar & Pestle',
    category: 'high',
    payouts: { 3: 14, 4: 43, 5: 145 },
    description: 'Brass apothecary mortar grinding rare lunar minerals',
    accentColor: '#38bdf8',
  },
  SPELLBOOK: {
    id: 'SPELLBOOK',
    name: 'Leather Spellbook',
    category: 'high',
    payouts: { 3: 22, 4: 72, 5: 253 },
    description: 'Ancient leather-bound grimoire of the Great Work',
    accentColor: '#fb923c',
  },
  POTION: {
    id: 'POTION',
    name: 'Glowing Potion Flask',
    category: 'high',
    payouts: { 3: 28, 4: 108, 5: 361 },
    description: 'Iridescent elixir containing liquid quintessence',
    accentColor: '#c084fc',
  },
  PHILOSOPHER_STONE: {
    id: 'PHILOSOPHER_STONE',
    name: "Philosopher's Stone",
    category: 'high',
    payouts: { 2: 4, 3: 69, 4: 217, 5: 721 },
    description: 'The magnum opus: transforms base metals into purest gold',
    accentColor: '#eab308',
  },
  CRUCIBLE_WILD: {
    id: 'CRUCIBLE_WILD',
    name: 'The Crucible (Wild)',
    category: 'wild',
    payouts: {},
    description: 'Appears on Reels 2, 3, 4. Expands from the center row to fill its reel and reveals a 2x, 3x, or 5x multiplier on a winning line!',
    accentColor: '#f97316',
  },
  OUROBOROS_SCATTER: {
    id: 'OUROBOROS_SCATTER',
    name: 'Ouroboros Seal (Scatter)',
    category: 'scatter',
    payouts: { 3: 1, 4: 7, 5: 36 }, // Total bet multiplier + Free Spins
    description: '3+ anywhere awards 10 Free Spins with Sticky Multiplier Wilds!',
    accentColor: '#14b8a6',
  },
};

/**
 * 20 Fixed Paylines for 5x3 Grid.
 * Values indicate the row index (0 = top, 1 = middle, 2 = bottom) for reels 0 to 4.
 */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // Line 1: Center horizontal
  [0, 0, 0, 0, 0], // Line 2: Top horizontal
  [2, 2, 2, 2, 2], // Line 3: Bottom horizontal
  [0, 1, 2, 1, 0], // Line 4: V shape down
  [2, 1, 0, 1, 2], // Line 5: V shape up
  [0, 0, 1, 0, 0], // Line 6: High dip
  [2, 2, 1, 2, 2], // Line 7: Low peak
  [1, 2, 2, 2, 1], // Line 8: Valley
  [1, 0, 0, 0, 1], // Line 9: Hill
  [0, 1, 1, 1, 0], // Line 10: Shallow valley
  [2, 1, 1, 1, 2], // Line 11: Shallow hill
  [1, 1, 0, 1, 1], // Line 12: Center hump
  [1, 1, 2, 1, 1], // Line 13: Center dip
  [0, 1, 0, 1, 0], // Line 14: Zigzag down
  [2, 1, 2, 1, 2], // Line 15: Zigzag up
  [1, 0, 1, 0, 1], // Line 16: Wave top
  [1, 2, 1, 2, 1], // Line 17: Wave bottom
  [0, 0, 2, 0, 0], // Line 18: Deep center drop
  [2, 2, 0, 2, 2], // Line 19: High center spike
  [0, 2, 0, 2, 0], // Line 20: Extreme oscillation
];

export interface CellPosition {
  reel: number; // 0 to 4
  row: number;  // 0 to 2
}

export interface WinningLine {
  lineIndex: number;
  symbolId: SymbolId;
  matchCount: number;
  positions: CellPosition[];
  baseWin: number;
  multiplier: number;
  finalWin: number;
}

export interface ExpandedWildInfo {
  reel: number;
  multiplier: 2 | 3 | 5;
  isSticky?: boolean;
}

export interface SpinResult {
  // 5 reels, each with 3 visible rows
  rawGrid: SymbolId[][]; // [reel][row]
  expandedGrid: SymbolId[][];
  expandedWilds: Record<number, ExpandedWildInfo>; // reelIndex -> wild info
  winningLines: WinningLine[];
  totalWin: number;
  totalMultiplier: number;
  scatterCount: number;
  scatterPositions: CellPosition[];
  scatterWin: number;
  isFreeSpinsTriggered: boolean;
  freeSpinsAwarded: number;
  isRetrigger: boolean;
}

export interface SpinHistoryItem {
  id: string;
  timestamp: number;
  bet: number;
  win: number;
  isBonus: boolean;
  expandedWildsCount: number;
  multiplier: number;
  winningLinesCount: number;
}
