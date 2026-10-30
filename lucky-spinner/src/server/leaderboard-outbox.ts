import type { BetEvent, IngestResult, LeaderboardService, RankUpdate } from "./leaderboard-service";

interface OutboxRecord {
  event_id: string;
  player_id: string;
  balance: number;
  balance_version: number;
  win_amount: number;
  occurred_at: string;
}

interface OutboxConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

async function postRpc<T>(config: OutboxConfig, name: string, body: unknown): Promise<T> {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, config.supabaseUrl), {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    console.error("Leaderboard outbox RPC failed", { name, status: response.status });
    throw new Error(`Leaderboard outbox ${name} failed`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export class LeaderboardOutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;

  constructor(
    private readonly service: LeaderboardService,
    private readonly publishUpdates: (updates: RankUpdate[]) => void,
    private readonly config: OutboxConfig,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.run(), 5_000);
    this.run();
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.running;
  }

  private run(): void {
    if (this.running) return;
    this.running = this.processBatch().finally(() => {
      this.running = null;
    });
  }

  private async processBatch(): Promise<void> {
    try {
      while (true) {
        const records = await postRpc<OutboxRecord[]>(this.config, "claim_leaderboard_outbox", {
          p_limit: 50,
        });
        if (!Array.isArray(records) || records.length === 0) return;
        await Promise.all(records.map((record) => this.processRecord(record)));
      }
    } catch (error) {
      console.error("Leaderboard outbox polling failed", error);
    }
  }

  private async processRecord(record: OutboxRecord): Promise<void> {
    try {
      const event: BetEvent = {
        eventId: record.event_id,
        playerId: record.player_id,
        balance: record.balance,
        balanceVersion: record.balance_version,
        winAmount: record.win_amount,
        occurredAt: new Date(record.occurred_at),
      };
      const result: IngestResult = await this.service.ingest(event);
      if (result.updates.length > 0) this.publishUpdates(result.updates);
      await postRpc<void>(this.config, "ack_leaderboard_outbox", {
        p_event_id: record.event_id,
        p_success: true,
        p_error: null,
      });
    } catch (error) {
      console.error("Leaderboard outbox delivery failed", { eventId: record.event_id, error });
      try {
        await postRpc<void>(this.config, "ack_leaderboard_outbox", {
          p_event_id: record.event_id,
          p_success: false,
          p_error: error instanceof Error ? error.message : "Delivery failed",
        });
      } catch (ackError) {
        console.error("Could not reschedule leaderboard outbox event", {
          eventId: record.event_id,
          error: ackError,
        });
      }
    }
  }
}
