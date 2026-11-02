export const SLOT_ROWS = 3;
export const SLOT_COLUMNS = 5;

export type SlotSymbol = {
  id: string;
  glyph: string;
  label: string;
  color: string;
};

export type SlotWin = {
  payline: number;
  symbol: string;
  matchCount: number;
  multiplier: number;
  payout: number;
  cells: Array<{ row: number; column: number }>;
};

export type SlotTheme = {
  id: string;
  title: string;
  colors: {
    background: string;
    panel: string;
    frame: string;
    cell: string;
    cellWin: string;
    border: string;
    accent: string;
    secondary: string;
    jackpot: string;
    text: string;
    muted: string;
  };
  symbols: readonly SlotSymbol[];
  reelWeights: readonly (readonly number[])[];
  payouts: Record<string, Partial<Record<3 | 4 | 5, number>>>;
  paylines: readonly (readonly number[])[];
  betPerLineOptions: readonly number[];
  activePaylineOptions: readonly number[];
};

export const cyberpunkSlotsTheme = {
  id: "neon-afterdark",
  title: "Neon Afterdark",
  colors: {
    background: "#080b18",
    panel: "#11152a",
    frame: "#222445",
    cell: "#0c1123",
    cellWin: "#152638",
    border: "#443c77",
    accent: "#48f7df",
    secondary: "#ff45c8",
    jackpot: "#ffe66d",
    text: "#eef8ff",
    muted: "#8fa1ba",
  },
  symbols: [
    { id: "volt", glyph: "ϟ", label: "VOLT", color: "#fff16b" },
    { id: "chip", glyph: "◈", label: "CHIP", color: "#48f7df" },
    { id: "drone", glyph: "⌘", label: "DRONE", color: "#9b85ff" },
    { id: "skull", glyph: "☠", label: "SKULL", color: "#ff5ea9" },
    { id: "seven", glyph: "7", label: "SEVEN", color: "#ff9d55" },
  ],
  reelWeights: [
    [10, 8, 6, 4, 2],
    [10, 8, 6, 4, 2],
    [10, 8, 6, 4, 2],
    [10, 8, 6, 4, 2],
    [10, 8, 6, 4, 2],
  ],
  payouts: {
    volt: { 3: 2, 4: 5, 5: 12 },
    chip: { 3: 3, 4: 8, 5: 20 },
    drone: { 3: 5, 4: 15, 5: 40 },
    skull: { 3: 10, 4: 30, 5: 100 },
    seven: { 3: 20, 4: 75, 5: 250 },
  },
  paylines: [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 0, 0],
    [2, 2, 1, 2, 2],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2],
    [1, 0, 1, 0, 1],
    [1, 2, 1, 2, 1],
    [0, 1, 0, 1, 0],
    [2, 1, 2, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1],
    [0, 2, 0, 2, 0],
  ],
  betPerLineOptions: [1, 5, 10, 25],
  activePaylineOptions: [1, 5, 10, 20],
} as const satisfies SlotTheme;

export function getSlotSymbol(
  symbolId: string,
  theme: SlotTheme = cyberpunkSlotsTheme,
): SlotSymbol | undefined {
  return theme.symbols.find((symbol) => symbol.id === symbolId);
}

export function generateSlotGrid(
  theme: SlotTheme = cyberpunkSlotsTheme,
  random: () => number = Math.random,
): string[][] {
  return Array.from({ length: SLOT_ROWS }, () =>
    Array.from({ length: SLOT_COLUMNS }, (_, column) => {
      const weights = theme.reelWeights[column];
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      let threshold = random() * totalWeight;
      for (let index = 0; index < weights.length; index += 1) {
        threshold -= weights[index];
        if (threshold < 0) return theme.symbols[index].id;
      }
      return theme.symbols[theme.symbols.length - 1].id;
    }),
  );
}

export function evaluateSlotLines(
  grid: string[][],
  activePaylineCount: number,
  betPerLine: number,
  theme: SlotTheme = cyberpunkSlotsTheme,
): { totalPayout: number; wins: SlotWin[] } {
  if (
    grid.length !== SLOT_ROWS
    || grid.some((row) => row.length !== SLOT_COLUMNS)
    || !theme.activePaylineOptions.some((option) => option === activePaylineCount)
    || !theme.betPerLineOptions.some((option) => option === betPerLine)
  ) {
    throw new RangeError("Invalid slots grid or wager selection.");
  }

  const wins: SlotWin[] = [];
  for (let lineIndex = 0; lineIndex < activePaylineCount; lineIndex += 1) {
    const payline = theme.paylines[lineIndex];
    const symbol = grid[payline[0]][0];
    let matchCount = 1;
    for (let column = 1; column < SLOT_COLUMNS; column += 1) {
      if (grid[payline[column]][column] !== symbol) break;
      matchCount += 1;
    }

    const multiplier = theme.payouts[symbol]?.[matchCount as 3 | 4 | 5] ?? 0;
    if (multiplier <= 0) continue;

    wins.push({
      payline: lineIndex + 1,
      symbol,
      matchCount,
      multiplier,
      payout: multiplier * betPerLine,
      cells: Array.from({ length: matchCount }, (_, column) => ({
        row: payline[column],
        column,
      })),
    });
  }

  return {
    totalPayout: wins.reduce((total, win) => total + win.payout, 0),
    wins,
  };
}
