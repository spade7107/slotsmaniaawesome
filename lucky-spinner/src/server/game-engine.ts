import { randomInt } from "node:crypto";
import {
  columnTargets,
  dozenTargets,
  numberTargets,
  outsideTargets,
  type BetTarget,
} from "../lib/roulette";
import { getBoostTier, type BoostTierId } from "../lib/boosts";

const slotSymbols = ["🍒", "🍋", "🔔", "⭐", "7️⃣"] as const;
const rouletteTargets = new Map<string, BetTarget>(
  [...numberTargets, ...dozenTargets, ...columnTargets, ...outsideTargets].map((target) => [
    target.id,
    target,
  ]),
);
const missSlice = { label: "NO PRIZE", multiplier: 0, angle: 34.125 };
const wheelSlices = [
  { label: "0.5x", multiplier: 0.5, angle: 100 },
  missSlice,
  { label: "5x", multiplier: 5, angle: 4 },
  { label: "1x", multiplier: 1, angle: 76 },
  missSlice,
  { label: "10x", multiplier: 10, angle: 2 },
  { label: "2x", multiplier: 2, angle: 30 },
  missSlice,
  { label: "25x", multiplier: 25, angle: 1 },
  { label: "3x", multiplier: 3, angle: 10 },
  missSlice,
  { label: "50x", multiplier: 50, angle: 0.5 },
] as const;

export interface GameOutcome {
  wager: number;
  payout: number;
  netProfit: number;
  result: Record<string, unknown>;
}

export interface WinRateBoost {
  tier: BoostTierId;
}

// Exact profitable-result frequencies for the current slot board and wheel slices.
const slotsProfitableProbability = 549_585 / 1_953_125;
const prizeWheelProfitableProbability = 380 / 2_880;
const probabilityResolution = 2 ** 32;

export function getLossConversionProbability(
  winRateIncrease: number,
  baselineWinProbability: number,
): number {
  if (
    !Number.isFinite(winRateIncrease) ||
    winRateIncrease <= 0 ||
    !Number.isFinite(baselineWinProbability) ||
    baselineWinProbability < 0 ||
    baselineWinProbability >= 1
  ) {
    throw new Error("Invalid boost probability");
  }
  return Math.min(1, winRateIncrease / 100 / (1 - baselineWinProbability));
}

function applyWinRateBoost(
  outcome: GameOutcome,
  boost: WinRateBoost,
  baselineWinProbability: number,
  sampleProfitableOutcome: () => GameOutcome,
): GameOutcome {
  const tier = getBoostTier(boost.tier);
  if (!tier) throw new Error("Unknown boost tier");

  const conversionChance = getLossConversionProbability(
    tier.winRateIncrease,
    baselineWinProbability,
  );
  const boosted = outcome.netProfit <= 0 &&
    randomInt(probabilityResolution) < conversionChance * probabilityResolution;
  const result = boosted ? sampleProfitableOutcome() : outcome;

  return {
    ...result,
    result: {
      ...result.result,
      boostApplied: boosted,
      boostTier: tier.id,
      boostWinRateIncrease: tier.winRateIncrease,
    },
  };
}

function isWholeCreditAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function randomSlotsOutcome(): GameOutcome {
  const wager = 10;
  const grid = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => slotSymbols[randomInt(slotSymbols.length)]),
  );
  let payout = 0;
  let winningLines = 0;
  const payLine = (line: readonly string[], diagonal: boolean) => {
    if (line[0] !== line[1] || line[1] !== line[2]) return;
    winningLines += 1;
    payout += diagonal ? 15 : line[0] === "7️⃣" ? 100 : 30;
  };

  for (const row of grid) payLine(row, false);
  for (let column = 0; column < 3; column += 1) {
    payLine(grid.map((row) => row[column]), false);
  }
  payLine([grid[0][0], grid[1][1], grid[2][2]], true);
  payLine([grid[0][2], grid[1][1], grid[2][0]], true);

  return {
    wager,
    payout,
    netProfit: payout - wager,
    result: { grid, winningLines, payout },
  };
}

export function resolveSlots(boost?: WinRateBoost): GameOutcome {
  const outcome = randomSlotsOutcome();
  if (!boost) return outcome;
  return applyWinRateBoost(outcome, boost, slotsProfitableProbability, () => {
    let winningOutcome = randomSlotsOutcome();
    while (winningOutcome.netProfit <= 0) winningOutcome = randomSlotsOutcome();
    return winningOutcome;
  });
}

export function resolveRoulette(rawBets: unknown): GameOutcome {
  if (!Array.isArray(rawBets) || rawBets.length < 1 || rawBets.length > 100) {
    throw new Error("Place between 1 and 100 roulette chips");
  }

  const bets = rawBets.map((rawBet) => {
    if (typeof rawBet !== "object" || rawBet === null || Array.isArray(rawBet)) {
      throw new Error("Invalid roulette bet");
    }
    const bet = rawBet as Record<string, unknown>;
    const target = typeof bet.targetId === "string" ? rouletteTargets.get(bet.targetId) : undefined;
    if (!target || !isWholeCreditAmount(bet.amount) || bet.amount < 1 || bet.amount > 1_000) {
      throw new Error("Invalid roulette bet");
    }
    return { target, amount: bet.amount };
  });
  const wager = bets.reduce((total, bet) => total + bet.amount, 0);
  if (!Number.isSafeInteger(wager) || wager > 10_000) {
    throw new Error("Roulette wager exceeds the per-round limit");
  }

  const number = randomInt(37);
  const payout = bets.reduce(
    (total, bet) =>
      total + (bet.target.numbers.includes(number) ? bet.amount * (bet.target.payout + 1) : 0),
    0,
  );
  return {
    wager,
    payout,
    netProfit: payout - wager,
    result: {
      number,
      bets: bets.map(({ target, amount }) => ({ targetId: target.id, amount })),
      payout,
    },
  };
}

function randomPrizeWheelOutcome(wager: number): GameOutcome {
  const roll = randomInt(2_880);
  let cursor = 0;
  const selectedIndex = wheelSlices.findIndex((item) => {
    cursor += item.angle * 8;
    return roll < cursor;
  });
  const prize = wheelSlices[selectedIndex] ?? wheelSlices[0];
  const center = cursor / 8 - prize.angle / 2;
  const payout = Math.floor(wager * prize.multiplier);
  return {
    wager,
    payout,
    netProfit: payout - wager,
    result: { label: prize.label, multiplier: prize.multiplier, payout, center, sliceIndex: selectedIndex },
  };
}

export function resolvePrizeWheel(wager: unknown, boost?: WinRateBoost): GameOutcome {
  if (typeof wager !== "number" || ![5, 10, 25, 50].includes(wager)) {
    throw new Error("Choose a valid prize-wheel wager");
  }
  const outcome = randomPrizeWheelOutcome(wager);
  if (!boost) return outcome;
  return applyWinRateBoost(outcome, boost, prizeWheelProfitableProbability, () => {
    let winningOutcome = randomPrizeWheelOutcome(wager);
    while (winningOutcome.netProfit <= 0) winningOutcome = randomPrizeWheelOutcome(wager);
    return winningOutcome;
  });
}

export interface BlackjackCard {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
}

export interface BlackjackState {
  deck: BlackjackCard[];
  nextCard: number;
  playerHand: BlackjackCard[];
  dealerHand: BlackjackCard[];
}

const cardValues = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const cardSuits: BlackjackCard["suit"][] = ["♠", "♥", "♦", "♣"];

function shuffledDeck(): BlackjackCard[] {
  const deck = cardSuits.flatMap((suit) => cardValues.map((value) => ({ suit, value })));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

export function blackjackHandValue(hand: BlackjackCard[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.value === "A") {
      total += 11;
      aces += 1;
    } else {
      total += ["J", "Q", "K"].includes(card.value) ? 10 : Number(card.value);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function startBlackjack(wager: unknown): {
  state: BlackjackState;
  payout: number;
  complete: boolean;
  result: Record<string, unknown>;
} {
  if (typeof wager !== "number" || ![10, 50, 100].includes(wager)) {
    throw new Error("Choose a valid blackjack bet");
  }
  const safeWager = wager;
  const deck = shuffledDeck();
  const state: BlackjackState = {
    deck,
    nextCard: 4,
    playerHand: [deck[0], deck[2]],
    dealerHand: [deck[1], deck[3]],
  };
  const playerValue = blackjackHandValue(state.playerHand);
  const dealerValue = blackjackHandValue(state.dealerHand);
  const playerNatural = playerValue === 21;
  const dealerNatural = dealerValue === 21;
  const complete = playerNatural || dealerNatural;
  const payout = playerNatural
    ? dealerNatural ? safeWager : Math.floor(safeWager * 2.5)
    : 0;

  return {
    state,
    payout,
    complete,
    result: {
      playerHand: state.playerHand,
      dealerHand: complete ? state.dealerHand : [null, state.dealerHand[1]],
      playerScore: playerValue,
      dealerScore: complete ? dealerValue : null,
      status: complete
        ? playerNatural && dealerNatural ? "push" : playerNatural ? "blackjack" : "lose"
        : "playing",
      payout,
    },
  };
}

export function advanceBlackjack(
  state: BlackjackState,
  action: unknown,
  wager: number,
): {
  state: BlackjackState;
  payout: number;
  complete: boolean;
  result: Record<string, unknown>;
} {
  if (action !== "hit" && action !== "stand") throw new Error("Choose hit or stand");
  const nextState: BlackjackState = structuredClone(state);
  let status: string = "playing";
  let payout = 0;
  let complete = false;

  if (action === "hit") {
    if (nextState.nextCard >= nextState.deck.length) throw new Error("No cards remain in this round");
    nextState.playerHand.push(nextState.deck[nextState.nextCard]);
    nextState.nextCard += 1;
    const playerValue = blackjackHandValue(nextState.playerHand);
    if (playerValue > 21) {
      status = "bust";
      complete = true;
    } else if (playerValue === 21) {
      return advanceBlackjack(nextState, "stand", wager);
    }
  } else {
    while (
      blackjackHandValue(nextState.dealerHand) < 17 &&
      nextState.nextCard < nextState.deck.length
    ) {
      nextState.dealerHand.push(nextState.deck[nextState.nextCard]);
      nextState.nextCard += 1;
    }
    const playerValue = blackjackHandValue(nextState.playerHand);
    const dealerValue = blackjackHandValue(nextState.dealerHand);
    if (dealerValue > 21) {
      status = "dealer-bust";
      payout = wager * 2;
    } else if (playerValue > dealerValue) {
      status = "win";
      payout = wager * 2;
    } else if (playerValue === dealerValue) {
      status = "push";
      payout = wager;
    } else {
      status = "lose";
    }
    complete = true;
  }

  const playerValue = blackjackHandValue(nextState.playerHand);
  const revealDealer = complete;
  return {
    state: nextState,
    payout,
    complete,
    result: {
      playerHand: nextState.playerHand,
      dealerHand: revealDealer ? nextState.dealerHand : [null, nextState.dealerHand[1]],
      playerScore: playerValue,
      dealerScore: revealDealer ? blackjackHandValue(nextState.dealerHand) : null,
      status,
      payout,
    },
  };
}
