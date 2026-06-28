/**
 * org-quota-store.ts
 *
 * Atomic counter store for per-org daily stream creation quotas.
 *
 * Design:
 *   - Each org gets a counter keyed by `org:<orgId>:streams_per_day:<YYYY-MM-DD>`.
 *   - The window is a fixed UTC calendar day (midnight-to-midnight), not a
 *     rolling 24-hour window. This makes the Retry-After header precise: the
 *     client always knows exactly when midnight UTC resets the quota.
 *   - increment() atomically bumps the counter and returns the new value plus
 *     the number of seconds until the window resets. Callers decide whether the
 *     result exceeds the configured limit.
 *   - Entries are cleaned up automatically after they expire (one day + buffer).
 */

export interface QuotaEntry {
  /** Number of streams created so far in the current UTC day. */
  count: number;
  /** UTC date string (YYYY-MM-DD) this entry belongs to. */
  date: string;
}

export interface QuotaIncrementResult {
  /** Counter value AFTER incrementing (1-based). */
  count: number;
  /** Seconds until the UTC day rolls over and the quota resets. */
  retryAfter: number;
}

export interface OrgQuotaStore {
  /**
   * Atomically increments the stream-creation counter for the given org on
   * the current UTC day and returns the new value together with the seconds
   * remaining until the quota window resets.
   */
  increment(orgId: string): Promise<QuotaIncrementResult>;

  /**
   * Returns the current counter for the org without incrementing it.
   * Useful in tests and health-check endpoints.
   */
  peek(orgId: string): Promise<number>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD format (UTC). */
export function utcDateString(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * Returns the number of whole seconds until the next UTC midnight.
 * Minimum 1 to avoid a 0 Retry-After on a request that lands exactly on
 * midnight.
 */
export function secondsUntilUtcMidnight(now = Date.now()): number {
  const nextMidnight = new Date(utcDateString(now));
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextMidnight.getTime() - now) / 1000));
}

// ── In-memory implementation ───────────────────────────────────────────────

export class InMemoryOrgQuotaStore implements OrgQuotaStore {
  /** Map from orgId → QuotaEntry for today. */
  private entries = new Map<string, QuotaEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up stale entries every hour so long-running processes don't leak.
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1_000);
    }
  }

  async increment(orgId: string): Promise<QuotaIncrementResult> {
    const today = utcDateString();
    const existing = this.entries.get(orgId);

    if (!existing || existing.date !== today) {
      // New day or first request — start a fresh counter.
      this.entries.set(orgId, { count: 1, date: today });
      return { count: 1, retryAfter: secondsUntilUtcMidnight() };
    }

    existing.count += 1;
    return { count: existing.count, retryAfter: secondsUntilUtcMidnight() };
  }

  async peek(orgId: string): Promise<number> {
    const today = utcDateString();
    const entry = this.entries.get(orgId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }

  /** Removes entries from previous UTC days. */
  private cleanup(): void {
    const today = utcDateString();
    for (const [orgId, entry] of this.entries.entries()) {
      if (entry.date !== today) {
        this.entries.delete(orgId);
      }
    }
  }

  /** Frees resources — call in tests after each suite. */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let globalQuotaStore: OrgQuotaStore | null = null;

export function getOrgQuotaStore(): OrgQuotaStore {
  if (!globalQuotaStore) {
    globalQuotaStore = new InMemoryOrgQuotaStore();
  }
  return globalQuotaStore;
}

export function setOrgQuotaStore(store: OrgQuotaStore): void {
  globalQuotaStore = store;
}

export function resetOrgQuotaStore(): void {
  globalQuotaStore = null;
}
