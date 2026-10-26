export type RouletteColor = "green" | "red" | "black";

export type BetTarget = {
  id: string;
  label: string;
  numbers: number[];
  payout: number;
  kind: "number" | "outside" | "dozen" | "column";
};

export type PlacedBet = {
  id: number;
  target: BetTarget;
  amount: number;
};

export const wheelOrder = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getNumberColor(number: number): RouletteColor {
  if (number === 0) return "green";
  return redNumbers.has(number) ? "red" : "black";
}

export const wheelGradient = `conic-gradient(${wheelOrder
  .map((number, index) => {
    const start = (index / wheelOrder.length) * 360;
    const end = ((index + 1) / wheelOrder.length) * 360;
    const color = getNumberColor(number);
    const fill = color === "green" ? "#23805c" : color === "red" ? "#bd3d39" : "#202622";
    return `${fill} ${start}deg ${end}deg`;
  })
  .join(", ")})`;

export const numberTargets: BetTarget[] = Array.from({ length: 37 }, (_, number) => ({
  id: `number-${number}`,
  label: `${number}`,
  numbers: [number],
  payout: 35,
  kind: "number",
}));

export const dozenTargets: BetTarget[] = [0, 1, 2].map((dozen) => ({
  id: `dozen-${dozen + 1}`,
  label: `${dozen + 1}${dozen === 0 ? "st" : dozen === 1 ? "nd" : "rd"} 12`,
  numbers: Array.from({ length: 12 }, (_, index) => dozen * 12 + index + 1),
  payout: 2,
  kind: "dozen",
}));

export const columnTargets: BetTarget[] = [0, 1, 2].map((column) => ({
  id: `column-${column + 1}`,
  label: `${column + 1}${column === 0 ? "st" : column === 1 ? "nd" : "rd"} column`,
  numbers: Array.from({ length: 12 }, (_, index) => index * 3 + column + 1),
  payout: 2,
  kind: "column",
}));

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

export const outsideTargets: BetTarget[] = [
  { id: "low", label: "1 - 18", numbers: range(1, 18), payout: 1, kind: "outside" },
  { id: "even", label: "EVEN", numbers: range(1, 36).filter((number) => number % 2 === 0), payout: 1, kind: "outside" },
  { id: "red", label: "RED", numbers: [...redNumbers], payout: 1, kind: "outside" },
  {
    id: "black",
    label: "BLACK",
    numbers: range(1, 36).filter((number) => !redNumbers.has(number)),
    payout: 1,
    kind: "outside",
  },
  { id: "odd", label: "ODD", numbers: range(1, 36).filter((number) => number % 2 === 1), payout: 1, kind: "outside" },
  { id: "high", label: "19 - 36", numbers: range(19, 36), payout: 1, kind: "outside" },
];

export function getWinningReturn(bets: PlacedBet[], result: number) {
  return bets.reduce(
    (total, bet) => total + (bet.target.numbers.includes(result) ? bet.amount * (bet.target.payout + 1) : 0),
    0
  );
}
