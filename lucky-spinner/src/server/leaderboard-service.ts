import Redis from "ioredis";

const MAX_SAFE_SCORE = Number.MAX_SAFE_INTEGER;
const WINDOW_RETENTION_SECONDS = 8 * 24 * 60 * 60;
const EVENT_ID_TTL_SECONDS = 10 * 60;

const APPLY_BET_EVENT_SCRIPT = `
if redis.call("EXISTS", KEYS[6]) == 1 then
  return {-1, 0, 0, 0, 0, 0, 0}
end

redis.call("SET", KEYS[6], "1", "EX", ARGV[5])

local playerId = ARGV[1]
local balance = tonumber(ARGV[2])
local winAmount = tonumber(ARGV[3])
local balanceVersion = tonumber(ARGV[4])
local previousVersion = tonumber(redis.call("HGET", KEYS[2], playerId) or "-1")
local balanceChanged = 0

if balanceVersion > previousVersion then
  redis.call("ZADD", KEYS[1], balance, playerId)
  redis.call("HSET", KEYS[2], playerId, balanceVersion)
  balanceChanged = 1
end

local function updateMaximum(key, expiry)
  if winAmount <= 0 then
    return 0, 0
  end
  local previous = tonumber(redis.call("ZSCORE", key, playerId) or "-1")
  local changed = 0
  if winAmount > previous then
    redis.call("ZADD", key, winAmount, playerId)
    changed = 1
  end
  if expiry > 0 then
    redis.call("EXPIREAT", key, expiry)
  end
  local rank = redis.call("ZREVRANK", key, playerId)
  return changed, rank and rank + 1 or 0
end

local dailyChanged, dailyRank = updateMaximum(KEYS[3], tonumber(ARGV[6]))
local weeklyChanged, weeklyRank = updateMaximum(KEYS[4], tonumber(ARGV[7]))
local allTimeChanged, allTimeRank = updateMaximum(KEYS[5], tonumber(ARGV[8]))
local balanceRank = redis.call("ZREVRANK", KEYS[1], playerId)

return {
  1,
  balanceChanged,
  balanceRank and balanceRank + 1 or 0,
  dailyChanged,
  dailyRank,
  weeklyChanged,
  weeklyRank,
  allTimeChanged,
  allTimeRank
}
`;

export type LeaderboardMetric = "balance" | "biggest-win";
export type LeaderboardWindow = "daily" | "weekly" | "all-time";

export interface BetEvent {
  eventId: string;
  playerId: string;
  balance: number;
  balanceVersion: number;
  winAmount: number;
  occurredAt: Date;
}

export interface RankUpdate {
  metric: LeaderboardMetric;
  window: LeaderboardWindow;
  playerId: string;
  username?: string;
  score: number;
  rank: number;
}

export interface IngestResult {
  duplicate: boolean;
  updates: RankUpdate[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  score: number;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isoWeekKey(date: Date): string {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${pad(week)}`;
}

function windowExpiry(date: Date, window: "daily" | "weekly"): number {
  const end = new Date(date);
  if (window === "daily") {
    end.setUTCHours(24, 0, 0, 0);
  } else {
    const day = end.getUTCDay() || 7;
    const daysUntilMonday = ((8 - day) % 7) || 7;
    end.setUTCDate(end.getUTCDate() + daysUntilMonday);
    end.setUTCHours(0, 0, 0, 0);
  }
  return Math.floor(end.getTime() / 1000) + WINDOW_RETENTION_SECONDS;
}

function parsePositiveRank(value: unknown): number {
  const rank = Number(value);
  return Number.isInteger(rank) && rank >= 0 ? rank : 0;
}

export class LeaderboardService {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
    });
    this.redis.on("error", (error: Error) => {
      console.error("Leaderboard Redis error", error);
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.healthCheck();
  }

  async ingest(event: BetEvent): Promise<IngestResult> {
    const dailyKey = `leaderboard:biggest-win:daily:${utcDateKey(event.occurredAt)}`;
    const weeklyKey = `leaderboard:biggest-win:weekly:${isoWeekKey(event.occurredAt)}`;
    const balanceKey = "leaderboard:balance:all-time";
    const allTimeKey = "leaderboard:biggest-win:all-time";
    const values = (await this.redis.eval(
      APPLY_BET_EVENT_SCRIPT,
      6,
      balanceKey,
      "leaderboard:balance:version",
      dailyKey,
      weeklyKey,
      allTimeKey,
      `leaderboard:event:${event.eventId}`,
      event.playerId,
      String(event.balance),
      String(event.winAmount),
      String(event.balanceVersion),
      String(EVENT_ID_TTL_SECONDS),
      String(windowExpiry(event.occurredAt, "daily")),
      String(windowExpiry(event.occurredAt, "weekly")),
      "0",
    )) as number[];

    if (Number(values[0]) === -1) return { duplicate: true, updates: [] };

    const updates: RankUpdate[] = [];
    if (Number(values[1]) === 1) {
      updates.push({
        metric: "balance",
        window: "all-time",
        playerId: event.playerId,
        score: event.balance,
        rank: parsePositiveRank(values[2]),
      });
    }

    const winTracks: Array<{
      changedIndex: number;
      rankIndex: number;
      window: LeaderboardWindow;
    }> = [
      { changedIndex: 3, rankIndex: 4, window: "daily" },
      { changedIndex: 5, rankIndex: 6, window: "weekly" },
      { changedIndex: 7, rankIndex: 8, window: "all-time" },
    ];
    for (const track of winTracks) {
      if (Number(values[track.changedIndex]) === 1) {
        updates.push({
          metric: "biggest-win",
          window: track.window,
          playerId: event.playerId,
          score: event.winAmount,
          rank: parsePositiveRank(values[track.rankIndex]),
        });
      }
    }
    return { duplicate: false, updates };
  }

  async getTop(
    metric: LeaderboardMetric,
    window: LeaderboardWindow,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const key = this.keyFor(metric, window, new Date());
    const raw = await this.redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
    const entries: LeaderboardEntry[] = [];
    for (let index = 0; index < raw.length; index += 2) {
      entries.push({
        rank: index / 2 + 1,
        playerId: raw[index],
        score: Number(raw[index + 1]),
      });
    }
    return entries;
  }

  async healthCheck(): Promise<void> {
    const response = await this.redis.ping();
    if (response !== "PONG") throw new Error("Unexpected Redis health check response");
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  private keyFor(metric: LeaderboardMetric, window: LeaderboardWindow, now: Date): string {
    if (metric === "balance") return "leaderboard:balance:all-time";
    if (window === "all-time") return "leaderboard:biggest-win:all-time";
    if (window === "daily") return `leaderboard:biggest-win:daily:${utcDateKey(now)}`;
    return `leaderboard:biggest-win:weekly:${isoWeekKey(now)}`;
  }
}

export function createLeaderboardService(redisUrl: string): LeaderboardService {
  return new LeaderboardService(redisUrl);
}

export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_SAFE_SCORE
  );
}
