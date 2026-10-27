export interface PlayerProfile {
  id: string;
  username: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_CACHE_TTL_MS = 60_000;
const MAX_CACHED_PROFILES = 10_000;

export class PlayerProfiles {
  private readonly cache = new Map<string, { username?: string; expiresAt: number }>();

  constructor(
    private readonly supabaseUrl?: string,
    private readonly serviceRoleKey?: string,
  ) {}

  async usernamesFor(playerIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(playerIds)].filter((id) => UUID_PATTERN.test(id));
    if (ids.length === 0 || !this.supabaseUrl || !this.serviceRoleKey) {
      return new Map();
    }

    const now = Date.now();
    const usernames = new Map<string, string>();
    const uncachedIds: string[] = [];
    for (const id of ids) {
      const cached = this.cache.get(id);
      if (!cached || cached.expiresAt <= now) {
        this.cache.delete(id);
        uncachedIds.push(id);
      } else if (cached.username) {
        usernames.set(id, cached.username);
      }
    }
    if (uncachedIds.length === 0) return usernames;

    const url = new URL("/rest/v1/profiles", this.supabaseUrl);
    url.searchParams.set("select", "id,username");
    url.searchParams.set("id", `in.(${uncachedIds.join(",")})`);

    const response = await fetch(url, {
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      console.error("Player profile lookup failed", { status: response.status });
      throw new Error("Player profile lookup failed");
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid profile service response");

    const resolved = new Map<string, string>();
    for (const row of rows) {
      if (
        typeof row === "object" &&
        row !== null &&
        "id" in row &&
        typeof row.id === "string" &&
        "username" in row &&
        typeof row.username === "string"
      ) {
        resolved.set(row.id, row.username);
      }
    }
    for (const id of uncachedIds) {
      const username = resolved.get(id);
      this.cache.set(id, { username, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      while (this.cache.size > MAX_CACHED_PROFILES) {
        const oldestId = this.cache.keys().next().value;
        if (!oldestId) break;
        this.cache.delete(oldestId);
      }
      if (username) usernames.set(id, username);
    }
    return usernames;
  }
}
