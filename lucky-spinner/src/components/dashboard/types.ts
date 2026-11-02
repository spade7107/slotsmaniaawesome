import type { ActiveBoost } from "@/lib/boosts";

export type DashboardQuest = {
  id: "rounds-3" | "rounds-5";
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
  claimable: boolean;
};

export type DashboardSummary = {
  profile: { username: string };
  stats: {
    completedRounds: number;
    totalWager: number;
    netProfit: number;
  };
  progression: {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
  };
  dailyBonus: {
    available: boolean;
    reward: number;
    resetsAt: string;
  };
  quests: DashboardQuest[];
};

export type DashboardResponse = {
  authenticated: boolean;
  balance: number;
  balanceVersion: number;
  activeBoost: ActiveBoost | null;
  popularGames: Record<string, number>;
  dashboard: DashboardSummary | null;
};
