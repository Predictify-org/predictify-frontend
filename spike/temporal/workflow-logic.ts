// spike/temporal/workflow-logic.ts
// Pure, determinism-safe logic extracted from Temporal workflow prototypes.
// No Temporal SDK imports — safe to unit-test without a running server.

export type TickCadence = "hourly" | "daily" | "monthly";

export interface StreamConfig {
  streamId: string;
  cadence: TickCadence;
  startedAt: number; // Unix ms
  endsAt: number;    // Unix ms
}

export interface TickResult {
  streamId: string;
  tickSequence: number;
  scheduledAt: number;
  settledAt?: number;
  status: "settled" | "skipped" | "expired";
}

/**
 * Computes the next tick timestamp after `fromMs` for the given cadence.
 * Uses UTC boundaries (no DST drift).
 */
export function nextTickAt(fromMs: number, cadence: TickCadence): number {
  const d = new Date(fromMs);
  switch (cadence) {
    case "hourly": {
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() + 1);
      return d.getTime();
    }
    case "daily": {
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.getTime();
    }
    case "monthly": {
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d.getTime();
    }
  }
}

/**
 * Returns all missed tick timestamps between `fromMs` (exclusive) and `toMs` (inclusive).
 * Used for catch-up on resume after a pause or worker downtime.
 */
export function missedTicks(
  fromMs: number,
  toMs: number,
  cadence: TickCadence
): number[] {
  const ticks: number[] = [];
  let cursor = nextTickAt(fromMs, cadence);
  while (cursor <= toMs) {
    ticks.push(cursor);
    cursor = nextTickAt(cursor, cadence);
  }
  return ticks;
}

/**
 * Returns true if the stream has expired (current time is past endsAt).
 */
export function isExpired(config: StreamConfig, nowMs: number): boolean {
  return nowMs >= config.endsAt;
}

/**
 * Builds a deterministic tick ID for idempotency.
 * Format: `<streamId>:<tickSequence>`
 */
export function tickId(streamId: string, tickSequence: number): string {
  return `${streamId}:${tickSequence}`;
}

/**
 * Computes the sleep duration (ms) until the next tick.
 * Returns 0 if the next tick is already in the past (catch-up scenario).
 */
export function sleepDurationMs(nowMs: number, nextTick: number): number {
  return Math.max(0, nextTick - nowMs);
}
