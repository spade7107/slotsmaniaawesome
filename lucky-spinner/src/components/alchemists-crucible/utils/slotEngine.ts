/**
 * Slot Machine Engine - Alchemist's Crucible
 * Evaluates 20 fixed paylines, Wild Expansions, Multipliers & Free Spins
 */

import {
  CellPosition,
  ExpandedWildInfo,
  PAYLINES,
  SpinResult,
  SymbolId,
  SYMBOLS,
  WinningLine,
} from '../types/slot';

// Base game math is calibrated to ~96.2% RTP. The Crucible Wild is deliberately
// rare (one stop in 96 per middle reel) because expanded wilds are very powerful.
export const BASE_REEL_STRIP: SymbolId[] = [
  'RUNE_CLUB', 'RUNE_DIAMOND', 'RUNE_HEART', 'RUNE_SPADE',
  'RUNE_CLUB', 'MORTAR', 'RUNE_DIAMOND', 'SPELLBOOK',
  'RUNE_HEART', 'POTION', 'RUNE_SPADE', 'PHILOSOPHER_STONE',
  'RUNE_CLUB', 'RUNE_DIAMOND', 'MORTAR', 'RUNE_HEART',
  'SPELLBOOK', 'RUNE_SPADE', 'POTION', 'OUROBOROS_SCATTER',
  'RUNE_CLUB', 'PHILOSOPHER_STONE', 'RUNE_DIAMOND', 'RUNE_HEART',
];

// Reels 2, 3, and 4 (indices 1, 2, 3) use this strip. It is generated from the
// original 24-stop template so the scatter frequency stays at 1 in 24 while the
// Crucible Wild frequency is reduced to 1 in 96 stops.
const MIDDLE_REEL_TEMPLATE: SymbolId[] = [
  'RUNE_CLUB', 'CRUCIBLE_WILD', 'RUNE_DIAMOND', 'MORTAR',
  'RUNE_HEART', 'CRUCIBLE_WILD', 'SPELLBOOK', 'RUNE_SPADE',
  'POTION', 'CRUCIBLE_WILD', 'PHILOSOPHER_STONE', 'OUROBOROS_SCATTER',
  'RUNE_CLUB', 'RUNE_DIAMOND', 'MORTAR', 'RUNE_HEART',
  'SPELLBOOK', 'RUNE_SPADE', 'POTION', 'CRUCIBLE_WILD',
  'PHILOSOPHER_STONE', 'RUNE_CLUB', 'RUNE_DIAMOND', 'RUNE_HEART',
];

const WILD_REPLACEMENTS: SymbolId[] = [
  'RUNE_CLUB', 'RUNE_DIAMOND', 'RUNE_HEART', 'RUNE_SPADE',
  'MORTAR', 'SPELLBOOK', 'POTION', 'PHILOSOPHER_STONE',
  'RUNE_CLUB', 'RUNE_DIAMOND', 'RUNE_HEART', 'RUNE_SPADE',
  'MORTAR', 'SPELLBOOK', 'POTION', 'PHILOSOPHER_STONE',
  'RUNE_CLUB', 'RUNE_DIAMOND', 'RUNE_HEART', 'RUNE_SPADE',
];

function buildMiddleReelStrip(length: number, wildCount: number): SymbolId[] {
  const strip: SymbolId[] = [];
  while (strip.length < length) strip.push(...MIDDLE_REEL_TEMPLATE);
  strip.length = length;

  let wildsToReplace = strip.filter(symbol => symbol === 'CRUCIBLE_WILD').length - wildCount;
  for (let index = strip.length - 1; index >= 0 && wildsToReplace > 0; index--) {
    if (strip[index] === 'CRUCIBLE_WILD') {
      strip[index] = WILD_REPLACEMENTS[wildsToReplace % WILD_REPLACEMENTS.length];
      wildsToReplace--;
    }
  }
  return strip;
}

export const MIDDLE_REEL_STRIP: SymbolId[] = buildMiddleReelStrip(96, 1);

const MULTIPLIER_POOL: (2 | 3 | 5)[] = [2, 2, 2, 3, 3, 5];

/**
 * Pick random symbol from a strip
 */
function getRandomSymbol(
  strip: SymbolId[],
  random: () => number
): SymbolId {
  const index = Math.floor(random() * strip.length);
  return strip[index];
}

/**
 * Roll a random multiplier: 2x (50%), 3x (33%), 5x (17%)
 */
export function rollRandomMultiplier(random: () => number = Math.random): 2 | 3 | 5 {
  const pick = MULTIPLIER_POOL[Math.floor(random() * MULTIPLIER_POOL.length)];
  return pick;
}

/**
 * Generates a spin grid, expands Crucible Wilds, evaluates paylines and scatters
 */
export function evaluateSpin(
  totalBet: number,
  isFreeSpinsMode: boolean = false,
  existingStickyWilds: Record<number, ExpandedWildInfo> = {},
  forcePreset?: 'scatters' | 'wilds' | 'mega_win' | 'random',
  random: () => number = Math.random
): SpinResult {
  const lineBet = totalBet / 20;
  const rawGrid: SymbolId[][] = [[], [], [], [], []];

  // Presets for immediate feature testing & evaluation
  if (forcePreset === 'scatters') {
    // Force 3 Scatters (reels 0, 2, 4)
    for (let reel = 0; reel < 5; reel++) {
      const strip = (reel >= 1 && reel <= 3) ? MIDDLE_REEL_STRIP : BASE_REEL_STRIP;
      for (let row = 0; row < 3; row++) {
        rawGrid[reel][row] = getRandomSymbol(strip, random);
      }
    }
    rawGrid[0][1] = 'OUROBOROS_SCATTER';
    rawGrid[2][0] = 'OUROBOROS_SCATTER';
    rawGrid[4][2] = 'OUROBOROS_SCATTER';
  } else if (forcePreset === 'wilds') {
    // Force Crucible Wilds on reels 1 and 2
    for (let reel = 0; reel < 5; reel++) {
      const strip = (reel >= 1 && reel <= 3) ? MIDDLE_REEL_STRIP : BASE_REEL_STRIP;
      for (let row = 0; row < 3; row++) {
        rawGrid[reel][row] = getRandomSymbol(strip, random);
      }
    }
    rawGrid[0][1] = 'PHILOSOPHER_STONE';
    rawGrid[1][0] = 'CRUCIBLE_WILD';
    rawGrid[2][2] = 'CRUCIBLE_WILD';
    rawGrid[3][1] = 'PHILOSOPHER_STONE';
    rawGrid[4][1] = 'PHILOSOPHER_STONE';
  } else if (forcePreset === 'mega_win') {
    // 5-of-a-kind Philosopher's Stones with 2 expanding wilds (e.g. 3x * 5x = 15x!)
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        rawGrid[reel][row] = 'PHILOSOPHER_STONE';
      }
    }
    rawGrid[1][1] = 'CRUCIBLE_WILD';
    rawGrid[2][1] = 'CRUCIBLE_WILD';
  } else {
    // Standard random spin
    for (let reel = 0; reel < 5; reel++) {
      const strip = (reel >= 1 && reel <= 3) ? MIDDLE_REEL_STRIP : BASE_REEL_STRIP;
      for (let row = 0; row < 3; row++) {
        // If there's an existing sticky wild in free spins, keep wild symbol
        if (isFreeSpinsMode && existingStickyWilds[reel]) {
          rawGrid[reel][row] = 'CRUCIBLE_WILD';
        } else {
          rawGrid[reel][row] = getRandomSymbol(strip, random);
        }
      }
    }
  }

  // 1. Detect and apply Crucible Wild Expansion on Reels 2, 3, 4 (indices 1, 2, 3)
  const expandedGrid: SymbolId[][] = rawGrid.map(col => [...col]);
  const expandedWilds: Record<number, ExpandedWildInfo> = { ...existingStickyWilds };

  for (let reel = 1; reel <= 3; reel++) {
    // If sticky wild already exists here
    if (existingStickyWilds[reel]) {
      for (let row = 0; row < 3; row++) {
        expandedGrid[reel][row] = 'CRUCIBLE_WILD';
      }
      continue;
    }

    // The Crucible expands only when it lands on the center row of the reel.
    const hasWild = rawGrid[reel][1] === 'CRUCIBLE_WILD';
    if (hasWild) {
      // Expands to cover entire reel
      for (let row = 0; row < 3; row++) {
        expandedGrid[reel][row] = 'CRUCIBLE_WILD';
      }
      // Assign random multiplier (2x, 3x, or 5x)
      expandedWilds[reel] = {
        reel,
        multiplier: rollRandomMultiplier(random),
        isSticky: isFreeSpinsMode,
      };
    }
  }

  // 2. Evaluate 20 Fixed Paylines (left-to-right)
  const winningLines: WinningLine[] = [];
  let totalLineWin = 0;
  const activeWildReelsInWins = new Set<number>();

  PAYLINES.forEach((linePattern, lineIndex) => {
    const lineSymbols: SymbolId[] = linePattern.map((row, reel) => expandedGrid[reel][row]);
    const firstSymbol = lineSymbols[0];

    // Scatters don't pay via paylines (they pay anywhere)
    if (firstSymbol === 'OUROBOROS_SCATTER') {
      return;
    }

    // Determine target matching symbol:
    // (Note: reel 0 cannot be wild since wilds only appear on reels 1, 2, 3)
    const targetSymbol = firstSymbol;
    let matchCount = 1;
    const matchedPositions: CellPosition[] = [{ reel: 0, row: linePattern[0] }];

    for (let reel = 1; reel < 5; reel++) {
      const sym = lineSymbols[reel];
      if (sym === targetSymbol || sym === 'CRUCIBLE_WILD') {
        matchCount++;
        matchedPositions.push({ reel, row: linePattern[reel] });
      } else {
        break;
      }
    }

    const symbolDef = SYMBOLS[targetSymbol];
    const basePayoutMultiplier = symbolDef?.payouts[matchCount] || 0;

    if (basePayoutMultiplier > 0) {
      // Use the highest multiplier among the expanded wilds on this line.
      let lineMultiplier = 1;
      for (let i = 0; i < matchCount; i++) {
        const reelIdx = matchedPositions[i].reel;
        if (expandedWilds[reelIdx]) {
          lineMultiplier = Math.max(lineMultiplier, expandedWilds[reelIdx].multiplier);
        }
      }

      const baseWin = lineBet * basePayoutMultiplier;
      const finalWin = baseWin * lineMultiplier;

      if (finalWin > 0) {
        winningLines.push({
          lineIndex,
          symbolId: targetSymbol,
          matchCount,
          positions: matchedPositions,
          baseWin,
          multiplier: lineMultiplier,
          finalWin,
        });

        totalLineWin += finalWin;
        matchedPositions.slice(0, matchCount).forEach(({ reel }) => {
          if (expandedWilds[reel]) activeWildReelsInWins.add(reel);
        });
      }
    }
  });

  // Highest multiplier among all expanded wilds that participated in a win.
  let totalMultiplier = 1;
  activeWildReelsInWins.forEach(reelIdx => {
    if (expandedWilds[reelIdx]) {
      totalMultiplier = Math.max(totalMultiplier, expandedWilds[reelIdx].multiplier);
    }
  });

  // 3. Evaluate Scatters (Ouroboros Seal)
  // Scatters pay anywhere and award free spins
  const scatterPositions: CellPosition[] = [];
  for (let reel = 0; reel < 5; reel++) {
    for (let row = 0; row < 3; row++) {
      if (rawGrid[reel][row] === 'OUROBOROS_SCATTER') {
        scatterPositions.push({ reel, row });
      }
    }
  }

  const scatterCount = scatterPositions.length;
  let scatterWin = 0;
  let isFreeSpinsTriggered = false;
  let freeSpinsAwarded = 0;
  let isRetrigger = false;

  if (scatterCount >= 3) {
    // 3, 4, 5 Scatters award:
    // Base Game: 10 Free Spins
    // Free Spins: Retrigger adds +5 Extra Spins
    if (isFreeSpinsMode) {
      isRetrigger = true;
      freeSpinsAwarded = 5;
    } else {
      isFreeSpinsTriggered = true;
      freeSpinsAwarded = 10;
    }

    const scatterMultiplier = SYMBOLS.OUROBOROS_SCATTER.payouts[scatterCount] || 1;
    scatterWin = totalBet * scatterMultiplier;
  }

  const totalWin = totalLineWin + scatterWin;

  return {
    rawGrid,
    expandedGrid,
    expandedWilds,
    winningLines,
    totalWin,
    totalMultiplier,
    scatterCount,
    scatterPositions,
    scatterWin,
    isFreeSpinsTriggered,
    freeSpinsAwarded,
    isRetrigger,
  };
}
