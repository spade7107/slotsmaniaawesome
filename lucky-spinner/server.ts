import "dotenv/config";
import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import { createApp } from "./src/server/app";
import { getConfig } from "./src/server/config";
import { createLeaderboardService } from "./src/server/leaderboard-service";
import { LeaderboardOutboxWorker } from "./src/server/leaderboard-outbox";
import { createLeaderboardSocket } from "./src/server/socket";

async function main(): Promise<void> {
  const config = getConfig();
  const leaderboard = createLeaderboardService(config.redisUrl);
  await leaderboard.connect();
  const updateBus = new EventEmitter();
  const app = createApp(leaderboard, config, (updates) => updateBus.emit("updates", updates));
  const server = createServer(app);
  const sockets = await createLeaderboardSocket(server, config.allowedOrigins, config.redisUrl);
  updateBus.on("updates", sockets.emitUpdates);
  const outbox = config.supabaseUrl && config.supabaseServiceRoleKey
    ? new LeaderboardOutboxWorker(
      leaderboard,
      sockets.emitUpdates,
      { supabaseUrl: config.supabaseUrl, serviceRoleKey: config.supabaseServiceRoleKey },
    )
    : null;
  outbox?.start();

  server.listen(config.port, () => {
    console.info(`Leaderboard API listening on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`Received ${signal}; shutting down leaderboard API`);
    void Promise.all([sockets.close(), outbox?.close()]).then(
      () => leaderboard.close(),
    ).then(
      () => process.exit(process.exitCode ?? 0),
      (error: unknown) => {
        console.error("Leaderboard shutdown failed", error);
        process.exitCode = 1;
        process.exit(1);
      },
    );
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((error: unknown) => {
  console.error("Failed to start leaderboard API", error);
  process.exitCode = 1;
});
