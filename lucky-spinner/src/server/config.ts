export interface ServerConfig {
  port: number;
  redisUrl: string;
  allowedOrigins: string[];
  ingestionApiKey?: string;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const ingestionApiKey = env.INGESTION_API_KEY?.trim() || undefined;
  if (env.NODE_ENV === "production" && (!ingestionApiKey || Buffer.byteLength(ingestionApiKey) < 32)) {
    throw new Error("INGESTION_API_KEY must contain at least 32 bytes in production");
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port,
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:6379",
    allowedOrigins,
    ingestionApiKey,
  };
}
