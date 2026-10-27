import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Server } from "socket.io";
import type {
  LeaderboardMetric,
  LeaderboardWindow,
  RankUpdate,
} from "./leaderboard-service";

const VALID_METRICS: LeaderboardMetric[] = ["balance", "biggest-win"];
const VALID_WINDOWS: LeaderboardWindow[] = ["daily", "weekly", "all-time"];

function isSubscription(
  value: unknown,
): value is { metric: LeaderboardMetric; window: LeaderboardWindow } {
  if (typeof value !== "object" || value === null) return false;
  const subscription = value as Record<string, unknown>;
  return (
    typeof subscription.metric === "string" &&
    VALID_METRICS.includes(subscription.metric as LeaderboardMetric) &&
    typeof subscription.window === "string" &&
    VALID_WINDOWS.includes(subscription.window as LeaderboardWindow) &&
    (subscription.metric !== "balance" || subscription.window === "all-time")
  );
}

export async function createLeaderboardSocket(
  httpServer: HttpServer,
  allowedOrigins: string[],
  redisUrl: string,
): Promise<{
  emitUpdates(updates: RankUpdate[]): void;
  close(): Promise<void>;
}> {
  const pubClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
  const subClient = pubClient.duplicate({
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
  pubClient.on("error", (error: Error) => console.error("Socket.IO Redis publisher error", error));
  subClient.on("error", (error: Error) => console.error("Socket.IO Redis subscriber error", error));
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
  } catch (error) {
    await Promise.allSettled([pubClient.quit(), subClient.quit()]);
    throw error;
  }

  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    maxHttpBufferSize: 10_000,
  });
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    socket.on("leaderboard:subscribe", (value: unknown) => {
      if (!isSubscription(value)) {
        socket.emit("leaderboard:error", { error: "Invalid leaderboard subscription" });
        return;
      }
      socket.join(`leaderboard:${value.metric}:${value.window}`);
    });

    socket.on("leaderboard:unsubscribe", (value: unknown) => {
      if (isSubscription(value)) {
        void socket.leave(`leaderboard:${value.metric}:${value.window}`);
      }
    });
  });

  return {
    emitUpdates(updates: RankUpdate[]) {
      for (const update of updates) {
        io.to(`leaderboard:${update.metric}:${update.window}`).emit("leaderboard:update", update);
      }
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          void Promise.all([pubClient.quit(), subClient.quit()]).then(
            () => resolve(),
            reject,
          );
        });
      });
    },
  };
}
