/**
 * In-memory stream database with per-stream mutex locking.
 *
 * withLock(id, fn) serialises all read-modify-write operations on a single
 * stream so that concurrent requests cannot interleave and corrupt state.
 * Every mutating route handler (pause, start, stop, settle, withdraw) MUST
 * acquire the lock before reading or writing db.streams[id].
 */

export type StreamStatus = "draft" | "active" | "paused" | "ended";

export interface Stream {
  id: string;
  status: StreamStatus;
  recipientId: string;
  /** Accumulated balance available for withdrawal (in smallest unit). */
  balance: number;
  /** ISO-8601 timestamp of last status transition. */
  updatedAt: string;
  /** Org-level approval required before pausing (optional policy flag). */
  requiresApprovalToPause?: boolean;
  /** Set when an org-policy approval is pending. */
  pendingApproval?: boolean;
}

export interface IdempotencyRecord {
  status: number;
  body: unknown;
}

// ---------------------------------------------------------------------------
// Shared in-memory store (module-level singleton, reset between tests via
// resetDb()).
// ---------------------------------------------------------------------------

export const db = {
  streams: {} as Record<string, Stream>,
  idempotencyKeys: {} as Record<string, IdempotencyRecord>,
};

/** Replace the store contents — used by tests to set up fixtures. */
export function resetDb(
  streams: Record<string, Stream> = {},
  idempotencyKeys: Record<string, IdempotencyRecord> = {},
): void {
  db.streams = { ...streams };
  db.idempotencyKeys = { ...idempotencyKeys };
}

// ---------------------------------------------------------------------------
// Per-stream mutex
// ---------------------------------------------------------------------------

/**
 * Map of stream-id → tail of the promise chain for that stream.
 * Each call to withLock appends to the chain, ensuring serial execution.
 */
const lockChains = new Map<string, Promise<unknown>>();

/**
 * Acquire an exclusive per-stream lock, run `fn`, then release.
 *
 * Guarantees that at most one critical section runs at a time for a given
 * stream id, regardless of how many concurrent requests arrive.
 *
 * @example
 * return withLock(id, async () => {
 *   const stream = db.streams[id];
 *   // ... read-modify-write ...
 *   db.streams[id] = updated;
 *   return NextResponse.json(updated);
 * });
 */
export async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  // Grab the current tail (or a resolved promise if no lock exists yet).
  const prev = lockChains.get(id) ?? Promise.resolve();

  // Build the next link: wait for the previous holder, then run fn.
  // We must never let a rejection in fn break the chain for future callers,
  // so we capture the result/error and re-throw after the chain is updated.
  let resolve!: () => void;
  const gate = new Promise<void>((r) => {
    resolve = r;
  });

  const next = prev.then(() => gate);
  lockChains.set(id, next);

  // Run the critical section now that we "hold" the lock.
  try {
    const result = await fn();
    return result;
  } finally {
    // Release: let the next waiter through and clean up if we're the last.
    resolve();
    // Prune the map once the chain is fully drained to avoid memory leaks.
    if (lockChains.get(id) === next) {
      lockChains.delete(id);
    }
  }
}
