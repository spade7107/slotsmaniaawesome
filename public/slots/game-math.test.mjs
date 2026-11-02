import assert from "node:assert/strict";
import test from "node:test";
import { cyberpunkTheme } from "./cyberpunk-theme.mjs";
import {
  COLUMNS,
  ROWS,
  evaluateSpin,
  generateGrid,
  getTotalBet,
  pickSymbol,
} from "./game-math.mjs";

test("the cyberpunk machine exposes twenty valid paylines and the selected bet options", () => {
  assert.equal(cyberpunkTheme.paylines.length, 20);
  assert.equal(new Set(cyberpunkTheme.paylines.map((line) => line.join(""))).size, 20);
  assert.ok(cyberpunkTheme.paylines.every((line) =>
    line.length === COLUMNS && line.every((row) => row >= 0 && row < ROWS),
  ));
  assert.deepEqual(cyberpunkTheme.betPerLineOptions, [1, 5, 10, 25]);
  assert.deepEqual(cyberpunkTheme.activePaylineOptions, [1, 5, 10, 20]);
});

test("bet cost is bet per line multiplied by active paylines", () => {
  assert.equal(getTotalBet(5, 20), 100);
  assert.throws(() => getTotalBet(0, 5), RangeError);
  assert.throws(() => getTotalBet(5, 1.5), RangeError);
  assert.throws(() => getTotalBet(Number.MAX_SAFE_INTEGER, 2), RangeError);
});

test("generated results always have three rows and five columns", () => {
  const grid = generateGrid(cyberpunkTheme, () => 0);
  assert.equal(grid.length, ROWS);
  assert.ok(grid.every((row) => row.length === COLUMNS));
  assert.ok(grid.flat().every((symbol) => symbol === "volt"));
});

test("weighted selection respects symbol weights and rejects invalid randomness", () => {
  assert.equal(pickSymbol(cyberpunkTheme, 0, () => 0), "volt");
  assert.equal(pickSymbol(cyberpunkTheme, 0, () => 0.999), "seven");
  assert.throws(() => pickSymbol(cyberpunkTheme, 0, () => 1), RangeError);
});

test("line wins pay the matching left-to-right run at the bet-per-line rate", () => {
  const grid = [
    ["volt", "volt", "volt", "chip", "volt"],
    ["chip", "drone", "skull", "seven", "chip"],
    ["skull", "seven", "chip", "drone", "skull"],
  ];

  const result = evaluateSpin(grid, [1], 5, cyberpunkTheme);
  assert.deepEqual(result, {
    totalWin: 10,
    wins: [{
      payline: 2,
      symbol: "volt",
      matchCount: 3,
      multiplier: 2,
      payout: 10,
      cells: [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ],
    }],
  });
});

test("each selected winning payline contributes its own payout", () => {
  const grid = Array.from({ length: ROWS }, () => Array(COLUMNS).fill("volt"));
  const result = evaluateSpin(grid, [0, 1], 1, cyberpunkTheme);

  assert.equal(result.wins.length, 2);
  assert.equal(result.totalWin, 24);
});

test("matching symbols that do not start on the left do not pay", () => {
  const grid = [
    ["chip", "volt", "volt", "volt", "volt"],
    ["drone", "chip", "skull", "seven", "volt"],
    ["skull", "seven", "chip", "drone", "skull"],
  ];

  assert.deepEqual(evaluateSpin(grid, [1], 1, cyberpunkTheme), {
    totalWin: 0,
    wins: [],
  });
});

test("invalid grid dimensions and duplicate paylines are rejected", () => {
  assert.throws(() => evaluateSpin([["volt"]], [0], 1, cyberpunkTheme), RangeError);
  assert.throws(() => evaluateSpin(generateGrid(cyberpunkTheme), null, 1, cyberpunkTheme), RangeError);
  assert.throws(
    () => evaluateSpin(generateGrid(cyberpunkTheme), [0, 0], 1, cyberpunkTheme),
    RangeError,
  );
});
