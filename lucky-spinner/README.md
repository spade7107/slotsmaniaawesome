# Slots Mania

The website is a single Next.js app served at the domain root. It contains the home page, game directory, account pages, leaderboard, and all games. Game balances and outcomes are server-authoritative; Supabase Postgres stores signed-in balances and game state, while the separate Express service and Redis continue to serve live leaderboards.

## Local setup

1. Install dependencies and configure environment values:

   ```bash
   npm ci
   copy .env.example .env.local
   copy .env.example .env
   ```

   Next.js reads `.env.local`; the Express service reads `.env`. Use the same Supabase server credentials in both. `NEXT_PUBLIC_*` and `GUEST_SESSION_SECRET` are frontend-only; keep `SUPABASE_SERVICE_ROLE_KEY` and `INGESTION_API_KEY` on servers only. In production, `GUEST_SESSION_SECRET` must have at least 32 bytes.

2. In Supabase, run the migrations in order:

   - `supabase/migrations/20261027000000_profiles.sql`
   - `supabase/migrations/20261029000000_game_accounts.sql`

   The first migration creates public usernames. The second creates protected wallets, temporary guest sessions, game-round storage, blackjack state, and the durable leaderboard outbox.

   Set the Supabase Auth Site URL to the website origin and allow that origin in its redirect URL settings so email-confirmed sign-ups can return to the app.

3. Start Redis and the leaderboard service, then start Next.js in another terminal:

   ```bash
   npm run server:dev
   npm run dev
   ```

   Open `http://localhost:3000`. The website uses same-origin `/api/game` requests; `NEXT_PUBLIC_LEADERBOARD_API_URL` points to the separate leaderboard API.

## Pages and old URLs

| Page | Route |
| --- | --- |
| Landing page | `/` |
| Game directory | `/games` |
| Slots | `/games/slots` |
| Blackjack | `/games/blackjack` |
| Classic roulette design | `/games/roulette` |
| Classic prize-wheel design | `/games/prize-wheel` |
| Existing Next.js roulette design | `/roulette` |
| Existing Next.js prize-wheel design | `/arcade` |
| Leaderboard, sign-in, sign-up | `/leaderboards`, `/login`, `/signup` |

Both roulette designs and both prize-wheel designs remain available with their existing visual treatments. Legacy `.html` URLs redirect to their new routes. The previous Next.js root route at `/lucky-spinner` redirects to `/roulette`.

The static source files in the repository's top-level `public/` directory are retained as migration references; Vercel no longer deploys them as a second website or uses `public/server.js` for gameplay.

## Accounts, balances, and game actions

Configure these for the Next.js deployment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the browser auth client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `SUPABASE_URL` | Supabase project URL used by server-side game requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for protected wallet and game operations |
| `GUEST_SESSION_SECRET` | HMAC key for temporary, HTTP-only guest-session cookies |
| `NEXT_PUBLIC_LEADERBOARD_API_URL` | Browser-reachable base URL for the Express leaderboard API |

Signed-in accounts receive 1,000 credits the first time their wallet is initialized. Credits persist in Supabase; there is no automatic refill or client-side reset. Guests can play with a temporary server-managed balance, but their balance is not attached to an account and their results are excluded from leaderboards.

`GET /api/game` initializes or reads the caller's balance and returns an active blackjack round when one exists. `POST /api/game` accepts game actions for slots, roulette, prize wheels, or blackjack. The server validates wagers, generates random outcomes, computes payouts, and updates balances atomically. Clients cannot submit a balance, score, or game outcome as authoritative data. Blackjack cards and deck state remain server-side.

Game actions require a UUID `operationId`; retries with the same operation ID are idempotent. Roulette sends the selected target IDs and chip amounts; the server validates them and chooses the winning number. The biggest-win leaderboard uses net profit after the wager, not the gross payout including returned stake.

## Leaderboard service

The long-running TypeScript Express service in `server.ts` remains separate from the Next.js deployment. Redis stores current balance and biggest-win sorted sets; Socket.IO publishes live updates. Supabase usernames are resolved from `profiles`.

Game results for signed-in accounts write durable outbox records in the same Postgres transaction as the wallet change. The Express service claims and acknowledges those records and applies them to Redis idempotently; if Redis is unavailable, the outbox retries. Guest game results never enter the outbox.

Configure the API service:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP and Socket.IO port |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Shared Redis connection |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated web origins |
| `SUPABASE_URL` | unset | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | unset | Server-only key for username lookup and outbox delivery |
| `INGESTION_API_KEY` | unset | Bearer key for the existing trusted event-ingestion endpoint; at least 32 bytes in production |

Production API startup requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and an `INGESTION_API_KEY` of at least 32 bytes. Never put a service-role or ingestion key in browser code or any `NEXT_PUBLIC_*` variable.

HTTP API:

- `GET /healthz` — Redis readiness.
- `GET /v1/leaderboards/balance/all-time?limit=50` — current balances.
- `GET /v1/leaderboards/biggest-win/{daily|weekly|all-time}?limit=50` — largest net win per player in the UTC period.
- `POST /v1/events/bets` — existing trusted upstream-ingestion API; requires the configured bearer key.

The API accepts leaderboard limits from 1 to 100. Socket.IO clients subscribe with `leaderboard:subscribe` and `{ "metric": "biggest-win", "window": "daily" }`. On `leaderboard:update`, refetch the HTTP leaderboard because other players' ranks may have shifted.

Run the API locally or build its production output:

```bash
npm run server:dev
npm run server:build
npm run server:start
```

Use persistent, backed-up Redis with TLS and network isolation in production. All API instances must share the same Redis deployment.

## Vercel deployment

The root `vercel.json` sends all site paths to the single Next.js service rooted at `lucky-spinner`; the separate static-site container has been removed. Configure the Supabase public URL/key, server-only service role key, guest-session secret, and leaderboard API URL in the Next.js service environment. Configure the API's secrets separately and set `ALLOWED_ORIGINS` to the exact public website origin.

After deployment, verify sign-up and sign-in, a guest game, an authenticated game, and the resulting leaderboard entry/live update. The API/Redis service must be deployed and reachable before leaderboard reads or event delivery can work.
