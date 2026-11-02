import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceBlackjack,
  blackjackHandValue,
  getLossConversionProbability,
  resolvePrizeWheel,
  resolveRoulette,
  resolveSlots,
  startBlackjack,
} from "../src/server/game-engine";
import { isBoostWagerAllowed } from "../src/lib/boosts";
import {
  cyberpunkSlotsTheme,
  evaluateSlotLines,
  SLOT_COLUMNS,
  SLOT_ROWS,
} from "../src/lib/slots";

test("slots server result has a three by five grid and settles selected paylines", () => {
  const outcome = resolveSlots(5, 10);
  const result = outcome.result;
  assert.equal(outcome.wager, 50);
  assert.ok(Number.isSafeInteger(outcome.payout));
  assert.equal(outcome.netProfit, outcome.payout - outcome.wager);
  assert.ok(Array.isArray(result.grid));
  assert.equal(result.grid.length, 3);
  assert.ok(result.grid.every((row) => Array.isArray(row) && row.length === 5));
  assert.ok(Array.isArray(result.winningLines));
  assert.equal(result.activePaylineCount, 10);
  assert.equal(result.betPerLine, 5);
  assert.equal(
    result.payout,
    result.winningLines.reduce((total, win) => total + Number(win.payout), 0),
  );
});

test("slots accepts only configured bet and payline options", () => {
  assert.throws(() => resolveSlots(2, 5), /valid slots bet/);
  assert.throws(() => resolveSlots(5, 3), /valid slots bet/);
  assert.throws(() => resolveSlots("5", 5), /valid slots bet/);
});

test("configured paylines award the themed five-symbol payout for each winning line", () => {
  const grid = Array.from({ length: SLOT_ROWS }, () =>
    Array.from({ length: SLOT_COLUMNS }, () => "seven"),
  );
  const result = evaluateSlotLines(grid, 20, 1);
  assert.equal(result.wins.length, 20);
  assert.equal(result.totalPayout, 20 * cyberpunkSlotsTheme.payouts.seven[5]);
  assert.ok(result.wins.every((win) => win.cells.length === SLOT_COLUMNS));
});

test("slots server settles every configured bet and payline combination", () => {
  for (const betPerLine of cyberpunkSlotsTheme.betPerLineOptions) {
    for (const activePaylineCount of cyberpunkSlotsTheme.activePaylineOptions) {
      const outcome = resolveSlots(betPerLine, activePaylineCount);
      assert.equal(outcome.wager, betPerLine * activePaylineCount);
      assert.equal(outcome.result.betPerLine, betPerLine);
      assert.equal(outcome.result.activePaylineCount, activePaylineCount);
      assert.ok(Array.isArray(outcome.result.winningLines));
      assert.equal(
        outcome.payout,
        outcome.result.winningLines.reduce((total, win) => total + win.payout, 0),
      );
    }
  }
});

test("boost conversion probability adds the configured absolute win-rate points", () => {
  for (const [winRateIncrease, baseline] of [
    [5, 0.0803],
    [10, 0.0903],
    [15, 380 / 2_880],
  ]) {
    const conversionChance = getLossConversionProbability(winRateIncrease, baseline);
    const boostedProbability = baseline + (1 - baseline) * conversionChance;
    assert.ok(Math.abs(boostedProbability - (baseline + winRateIncrease / 100)) < 1e-12);
  }
  assert.throws(() => getLossConversionProbability(0, 0.2));
  assert.throws(() => getLossConversionProbability(5, 1));
});

test("active boost bet limits include the boundary and reject larger wagers", () => {
  const basic = { maxBet: 10 };
  assert.equal(isBoostWagerAllowed(10, basic), true);
  assert.equal(isBoostWagerAllowed(11, basic), false);
  assert.equal(isBoostWagerAllowed(0, basic), false);
  assert.equal(isBoostWagerAllowed(10.5, basic), false);
});

test("active boosts label slots and prize-wheel results without affecting other games", () => {
  const slots = resolveSlots(1, 5, { tier: "basic" });
  assert.equal(slots.result.boostTier, "basic");
  assert.equal(slots.result.boostWinRateIncrease, 5);
  assert.equal(typeof slots.result.boostApplied, "boolean");

  const wheel = resolvePrizeWheel(10, { tier: "plus" });
  assert.equal(wheel.result.boostTier, "plus");
  assert.equal(wheel.result.boostWinRateIncrease, 10);
  assert.equal(typeof wheel.result.boostApplied, "boolean");

  const roulette = resolveRoulette([{ targetId: "number-0", amount: 5 }]);
  assert.equal("boostTier" in roulette.result, false);
});

test("roulette rejects client-supplied target definitions", () => {
  assert.throws(() => resolveRoulette([{ targetId: "number-0; DROP TABLE profiles", amount: 5 }]));
  assert.throws(() => resolveRoulette([{ targetId: "number-0", amount: 0 }]));
  assert.throws(() => resolveRoulette([]));
});

test("roulette server result stays within the European wheel", () => {
  const outcome = resolveRoulette([{ targetId: "number-0", amount: 5 }]);
  assert.equal(outcome.wager, 5);
  assert.ok(Number(outcome.result.number) >= 0 && Number(outcome.result.number) <= 36);
  assert.equal(outcome.netProfit, outcome.payout - outcome.wager);
});

test("prize wheel accepts only configured wagers and returns a weighted slice", () => {
  assert.throws(() => resolvePrizeWheel("10"));
  const outcome = resolvePrizeWheel(25);
  assert.equal(outcome.wager, 25);
  assert.ok(Number.isInteger(outcome.result.sliceIndex));
  assert.ok(Number(outcome.result.center) >= 0 && Number(outcome.result.center) < 360);
  assert.equal(outcome.netProfit, outcome.payout - outcome.wager);
});

test("blackjack scores aces correctly and keeps each round's deck server-generated", () => {
  assert.equal(blackjackHandValue([{ suit: "♠", value: "A" }, { suit: "♥", value: "K" }]), 21);
  assert.equal(blackjackHandValue([
    { suit: "♠", value: "A" },
    { suit: "♥", value: "A" },
    { suit: "♦", value: "9" },
  ]), 21);

  const round = startBlackjack(10);
  assert.equal(round.state.deck.length, 52);
  assert.equal(new Set(round.state.deck.map((card) => `${card.value}-${card.suit}`)).size, 52);
  assert.throws(() => startBlackjack(11));
  if (!round.complete) {
    const settled = advanceBlackjack(round.state, "stand", 10);
    assert.equal(settled.complete, true);
    assert.ok([0, 10, 20].includes(settled.payout));
  }
});
