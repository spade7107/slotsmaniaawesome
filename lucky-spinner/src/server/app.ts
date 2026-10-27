import { timingSafeEqual } from "node:crypto";
import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import type { ServerConfig } from "./config";
import {
  isValidScore,
  type BetEvent,
  type LeaderboardMetric,
  type LeaderboardService,
  type LeaderboardWindow,
  type RankUpdate,
} from "./leaderboard-service";
import { PlayerProfiles } from "./player-profiles";

const MAX_EVENT_AGE_MS = 8 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 1000;
const PLAYER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,63}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBetEvent(body: unknown): BetEvent {
  if (!isRecord(body)) throw new HttpError(400, "Request body must be a JSON object");
  const { eventId, playerId, balance, balanceVersion, winAmount, occurredAt } = body;

  if (typeof eventId !== "string" || !EVENT_ID_PATTERN.test(eventId)) {
    throw new HttpError(400, "eventId must be 1-128 safe characters");
  }
  if (typeof playerId !== "string" || !PLAYER_ID_PATTERN.test(playerId)) {
    throw new HttpError(400, "playerId must be 1-64 safe characters");
  }
  if (!isValidScore(balance) || !isValidScore(winAmount)) {
    throw new HttpError(400, "balance and winAmount must be non-negative safe integers");
  }
  if (!isValidScore(balanceVersion)) {
    throw new HttpError(400, "balanceVersion must be a non-negative safe integer");
  }
  if (
    typeof occurredAt !== "string" ||
    !ISO_TIMESTAMP_PATTERN.test(occurredAt) ||
    !Number.isFinite(Date.parse(occurredAt))
  ) {
    throw new HttpError(400, "occurredAt must be a valid ISO-8601 timestamp");
  }

  const parsedDate = new Date(occurredAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, "occurredAt must be a valid ISO-8601 timestamp");
  }
  const age = Date.now() - parsedDate.getTime();
  if (age > MAX_EVENT_AGE_MS || age < -MAX_FUTURE_SKEW_MS) {
    throw new HttpError(400, "occurredAt is outside the accepted event time range");
  }

  return { eventId, playerId, balance, balanceVersion, winAmount, occurredAt: parsedDate };
}

function setCorsHeaders(config: ServerConfig) {
  return (request: Request, response: Response, next: express.NextFunction) => {
    const origin = request.get("origin");
    if (origin && config.allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    }
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  };
}

function hasValidApiKey(request: Request, configuredKey?: string): boolean {
  if (!configuredKey) return false;
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(configuredKey);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function parseLeaderboardQuery(
  metricValue: string,
  windowValue: string,
): { metric: LeaderboardMetric; window: LeaderboardWindow } {
  if (metricValue !== "balance" && metricValue !== "biggest-win") {
    throw new HttpError(400, "metric must be balance or biggest-win");
  }
  if (
    windowValue !== "daily" &&
    windowValue !== "weekly" &&
    windowValue !== "all-time"
  ) {
    throw new HttpError(400, "window must be daily, weekly, or all-time");
  }
  if (metricValue === "balance" && windowValue !== "all-time") {
    throw new HttpError(400, "balance supports only the all-time window");
  }
  return { metric: metricValue, window: windowValue };
}

export function createApp(
  service: LeaderboardService,
  config: ServerConfig,
  publishUpdates: (updates: RankUpdate[]) => void,
) {
  const app = express();
  const profiles = new PlayerProfiles(config.supabaseUrl, config.supabaseServiceRoleKey);
  app.disable("x-powered-by");
  app.use(setCorsHeaders(config));
  app.use(express.json({ limit: "16kb", strict: true }));

  app.get("/healthz", async (_request, response) => {
    try {
      await service.healthCheck();
      response.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("Leaderboard health check failed", error);
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.get("/v1/leaderboards/:metric/:window", async (request, response) => {
    const { metric, window } = parseLeaderboardQuery(request.params.metric, request.params.window);
    const requestedLimit = Number(request.query.limit ?? 50);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      throw new HttpError(400, "limit must be an integer between 1 and 100");
    }
    const entries = await service.getTop(metric, window, requestedLimit);
    const usernames = await profiles.usernamesFor(entries.map((entry) => entry.playerId));
    response.json({
      metric,
      window,
      entries: entries.map((entry) => ({
        ...entry,
        username: usernames.get(entry.playerId) ?? "Player",
      })),
    });
  });

  app.post("/v1/events/bets", async (request, response) => {
    if (!config.ingestionApiKey) {
      throw new HttpError(503, "Event ingestion is not configured");
    }
    if (!hasValidApiKey(request, config.ingestionApiKey)) {
      throw new HttpError(401, "Valid bearer token required");
    }
    const event = parseBetEvent(request.body);
    const result = await service.ingest(event);
    if (result.updates.length > 0) {
      publishUpdates(result.updates);
    }
    response.status(result.duplicate ? 200 : 202).json({
      accepted: true,
      duplicate: result.duplicate,
      updates: result.updates,
    });
  });

  app.use((_request, _response, next) => {
    next(new HttpError(404, "Route not found"));
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    void _next;
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    if (isRecord(error) && (error.status === 400 || error.status === 413)) {
      response.status(error.status).json({
        error: error.status === 413 ? "Request body is too large" : "Invalid JSON request body",
      });
      return;
    }
    console.error("Leaderboard request failed", error);
    response.status(503).json({ error: "Leaderboard service temporarily unavailable" });
  };
  app.use(errorHandler);

  return app;
}
