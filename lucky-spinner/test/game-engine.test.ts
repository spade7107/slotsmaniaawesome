import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceBlackjack,
  blackjackHandValue,
  resolvePrizeWheel,
  resolveRoulette,
  resolveSlots,
  startBlackjack,
} from "../src/server/game-engine";

test("slots server result has a three by three grid and settled integer payout", () => {
  const outcome = resolveSlots();
  const result = outcome.result;
  assert.equal(outcome.wager, 10);
  assert.ok(Number.isSafeInteger(outcome.payout));
  assert.equal(outcome.netProfit, outcome.payout - outcome.wager);
  assert.ok(Array.isArray(result.grid));
  assert.equal(result.grid.length, 3);
  assert.ok(result.grid.every((row) => Array.isArray(row) && row.length === 3));
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
