This is a [Next.js](https://nextjs.org) game frontend with a separately deployable TypeScript leaderboard API.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Real-time leaderboard backend

The Express service in `server.ts` is independent of the Next.js web server. It stores balances and biggest-win scores in Redis sorted sets, updates them atomically through a Lua script, and distributes Socket.IO updates across API instances through the Socket.IO Redis adapter. It does not write bet events to the game database.

Scores are non-negative integer credits (for example, cents or the game's smallest credit unit); never send floating-point currency. Bet events must carry a stable, unique `eventId` so short-term retries are deduplicated, and a per-player monotonic `balanceVersion` so out-of-order events cannot overwrite a newer balance. Event IDs are retained for ten minutes; the balance version and per-player maximum win scores make repeated state updates idempotent beyond that interval. `occurredAt` must be an ISO-8601 timestamp no more than eight days old or one minute in the future. Use opaque player IDs, not emails or other personal data. The upstream game/settlement service is responsible for authenticating its event source and sending the authoritative balance, balance version, and win amount.

Configure the backend environment:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | HTTP and Socket.IO port |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |
| `INGESTION_API_KEY` | unset | Required bearer token for bet event ingestion; at least 32 bytes and required at startup in production |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated browser origins for HTTP and Socket.IO |

Start Redis, then run the backend in development:

```bash
npm run server:dev
```

Compile and run the production server:

```bash
npm run server:build
npm run server:start
```

### HTTP API

- `POST /v1/events/bets` — JSON body containing `eventId`, `playerId`, `balance`, `balanceVersion`, `winAmount`, and `occurredAt`. Send the configured API key as a bearer token in the `Authorization` header. Duplicate event IDs seen within ten minutes return `200`; newly accepted events return `202`.
- `GET /v1/leaderboards/balance/all-time?limit=50` — current player balances.
- `GET /v1/leaderboards/biggest-win/{daily|weekly|all-time}?limit=50` — each player's highest win in that UTC period.
- `GET /healthz` — Redis readiness check.

The `balance` metric supports only the `all-time` window. Daily keys expire after the period plus eight days; weekly keys expire after the period plus eight days. All-time scores are retained. The API accepts limits from 1 to 100.

### Socket.IO

Connect to the backend and emit `leaderboard:subscribe` with `{ "metric": "biggest-win", "window": "daily" }` (or another supported metric/window). The server emits `leaderboard:update` events containing the changed player's `playerId`, `score`, and current `rank`. Refetch the HTTP leaderboard when a changed rank may have shifted other players' positions. Use `leaderboard:unsubscribe` with the same subscription object to leave a room.

Run multiple API instances behind a load balancer with sticky sessions enabled if Socket.IO long-polling is used. All instances must share the same Redis deployment and ingestion API key. Redis is the authoritative leaderboard store; provision it for the required write throughput, persistence, backups, and high availability. Use TLS and network isolation for Redis and the ingestion endpoint in production.

## Deploy the frontend on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
