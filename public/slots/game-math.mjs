export const ROWS = 3;
export const COLUMNS = 5;

export function getTotalBet(betPerLine, activePaylineCount) {
  if (!Number.isSafeInteger(betPerLine) || betPerLine <= 0) {
    throw new RangeError("Bet per line must be a positive whole number.");
  }
  if (!Number.isSafeInteger(activePaylineCount) || activePaylineCount <= 0) {
    throw new RangeError("Active paylines must be a positive whole number.");
  }
  const totalBet = betPerLine * activePaylineCount;
  if (!Number.isSafeInteger(totalBet)) {
    throw new RangeError("Total bet must be a safe whole number.");
  }
  return totalBet;
}

export function pickSymbol(theme, reelIndex, random = Math.random) {
  const weights = theme.reelWeights[reelIndex];
  if (!weights || weights.length !== theme.symbols.length) {
    throw new RangeError(`Theme is missing weights for reel ${reelIndex + 1}.`);
  }
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError(`Reel ${reelIndex + 1} has invalid symbol weights.`);
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new RangeError(`Reel ${reelIndex + 1} must have a positive total weight.`);
  }

  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new RangeError("Random source must return a value from 0 (inclusive) to 1 (exclusive).");
  }

  let threshold = roll * totalWeight;
  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) return theme.symbols[index].id;
  }

  return theme.symbols[theme.symbols.length - 1].id;
}

export function generateGrid(theme, random = Math.random) {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => pickSymbol(theme, column, random)),
  );
}

export function evaluateSpin(grid, activePaylineIndexes, betPerLine, theme) {
  if (!Array.isArray(activePaylineIndexes)) {
    throw new RangeError("Active payline indexes must be an array.");
  }
  getTotalBet(betPerLine, activePaylineIndexes.length);
  if (
    !Array.isArray(grid)
    || grid.length !== ROWS
    || grid.some((row) => !Array.isArray(row) || row.length !== COLUMNS)
  ) {
    throw new RangeError(`Slot result must contain ${ROWS} rows and ${COLUMNS} columns.`);
  }
  if (new Set(activePaylineIndexes).size !== activePaylineIndexes.length) {
    throw new RangeError("Active payline indexes must be unique.");
  }

  const wins = [];
  for (const index of activePaylineIndexes) {
    const payline = theme.paylines[index];
    if (!payline || payline.length !== COLUMNS) {
      throw new RangeError(`Invalid payline index: ${index}.`);
    }

    const symbol = grid[payline[0]][0];
    let matchCount = 1;
    for (let column = 1; column < COLUMNS; column += 1) {
      if (grid[payline[column]][column] !== symbol) break;
      matchCount += 1;
    }

    const multiplier = theme.payouts[symbol]?.[matchCount] ?? 0;
    if (multiplier <= 0) continue;

    wins.push({
      payline: index + 1,
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
    totalWin: wins.reduce((total, win) => total + win.payout, 0),
    wins,
  };
}
