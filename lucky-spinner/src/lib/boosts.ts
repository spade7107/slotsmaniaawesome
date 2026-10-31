export const BOOST_TIERS = [
  {
    id: "basic",
    name: "Basic",
    price: 100,
    maxBet: 10,
    winRateIncrease: 5,
    accent: "#67d8c6",
    description: "A little extra luck for your next session.",
  },
  {
    id: "plus",
    name: "Plus",
    price: 250,
    maxBet: 50,
    winRateIncrease: 10,
    accent: "#8da9ff",
    description: "A bigger boost for bigger spins.",
  },
  {
    id: "premium",
    name: "Premium",
    price: 500,
    maxBet: 100,
    winRateIncrease: 15,
    accent: "#f3cc70",
    description: "The ultimate 25-play advantage.",
  },
] as const;

export type BoostTierId = (typeof BOOST_TIERS)[number]["id"];

export interface ActiveBoost {
  id: string;
  tier: BoostTierId;
  remainingPlays: number;
  maxBet: number;
  winRateIncrease: number;
}

export function getBoostTier(tier: string) {
  return BOOST_TIERS.find((item) => item.id === tier);
}

export function isBoostWagerAllowed(
  wager: number,
  boost: Pick<ActiveBoost, "maxBet">,
): boolean {
  return Number.isSafeInteger(wager) && wager > 0 && wager <= boost.maxBet;
}
