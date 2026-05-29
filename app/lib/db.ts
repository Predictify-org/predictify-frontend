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

const initialUsers: User[] = [
  {
    wallet_address: "GD7H...3J4K",
    email: "ada@creativestudio.io",
    display_name: "Ada Creative",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const initialStreams: Stream[] = [
  {
    id: "stream-ada",
    recipient: "Ada Creative Studio",
    rate: "120 XLM / month",
    schedule: "Pays every 30 days",
    status: "active",
    nextAction: "pause",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-28T10:30:00Z",
    email: "ada@creativestudio.io",
    label: "Design Retainer Q2",
    partnerId: "PARTNER-123",
    // On-chain escrow fields (i128 raw units)
    token: "XLM",
    senderAddress: "GD7H...3J4K",
    recipientAddress: "GCRE...ADA1",
    totalAmount: "3600000000",
    releasedAmount: "1200000000",
    vestedAmount: "1800000000",
  },
  {
    id: "stream-kemi",
    recipient: "Kemi Onboarding Support",
    rate: "32 XLM / week",
    schedule: "Draft stream ready to launch",
    status: "draft",
    nextAction: "start",
    createdAt: "2026-04-10T14:00:00Z",
    updatedAt: "2026-04-28T11:00:00Z",
    email: "kemi@onboarding.io",
    memo: "April Support batch",
    token: "XLM",
    senderAddress: "GD7H...3J4K",
    recipientAddress: "GCRE...KEMI",
    totalAmount: "1280000000",
    releasedAmount: "0",
    vestedAmount: "0",
  },
  {
    id: "stream-yusuf",
    recipient: "Yusuf QA Partnership",
    rate: "18 XLM / day",
    schedule: "Ended yesterday with funds available",
    status: "ended",
    nextAction: "withdraw",
    createdAt: "2026-04-15T08:00:00Z",
    updatedAt: "2026-04-27T20:00:00Z",
    token: "XLM",
    senderAddress: "GD7H...3J4K",
    recipientAddress: "GCRE...YUSUF",
    totalAmount: "648000000",
    releasedAmount: "0",
    vestedAmount: "648000000",
  },
];

const initialActivity: ActivityEvent[] = [
  {
    id: "a7383234-4224-49dc-b868-0cdf37649fda",
    type: "wallet.connected",
    timestamp: "2026-04-28T09:00:00Z",
    description: "Wallet connected and authenticated.",
  },
  {
    id: "2b9d1d0c-bef4-46bc-a783-3073b28353fc",
    type: "stream.created",
    streamId: "stream-ada",
    timestamp: "2026-04-01T09:00:00Z",
    description: "Stream 'Design Retainer' created and set to draft.",
  },
  {
    id: "d1578871-4be9-4c6a-bef5-12b2b5836478",
    type: "stream.started",
    streamId: "stream-ada",
    timestamp: "2026-04-01T09:05:00Z",
    description: "Stream 'Design Retainer' activated.",
  },
  {
    id: "288f315d-5520-46e9-8acf-96994c87b786",
    type: "stream.created",
    streamId: "stream-kemi",
    timestamp: "2026-04-10T14:00:00Z",
    description: "Stream 'Kemi Onboarding Support' created as draft.",
  },
  {
    id: "3bea183d-c3b5-4e96-9fbe-804f3aee49e9",
    type: "stream.created",
    streamId: "stream-yusuf",
    timestamp: "2026-04-15T08:00:00Z",
    description: "Stream 'Yusuf QA Partnership' created.",
  },
  {
    id: "5ffa85da-27a4-4f7c-bde0-e5c067a28015",
    type: "stream.stopped",
    streamId: "stream-yusuf",
    timestamp: "2026-04-27T20:00:00Z",
    description: "Stream 'Yusuf QA Partnership' stopped and settled automatically.",
  },
];

function createUsersMap(): Map<string, User> {
  return new Map(initialUsers.map((user) => [user.wallet_address, { ...user }]));
}

function createStreamsMap(): Map<string, Stream> {
  return new Map(initialStreams.map((stream) => [stream.id, { ...stream }]));
}

function createActivityMap(): Map<string, ActivityEvent> {
  return new Map(initialActivity.map((event) => [event.id, { ...event }]));
}


// ---------------------------------------------------------------------------
// Shared in-memory store (module-level singleton, reset between tests via
// resetDb()).
// ---------------------------------------------------------------------------

const streamsMap = createStreamsMap();
(streamsMap as any).findOne = function(tenant: string, id: string) {
  const row = streamsMap.get(id);
  if (!row) return null;
  return (row as any).tenant === tenant ? row : null;
};

export const db = {
  users: createUsersMap(),
  streams: streamsMap as unknown as Map<string, Stream> & { findOne(tenant: string, id: string): Stream | null },
  activity: createActivityMap(),
  idempotency: new Map<string, unknown>(),
  exportJobs: new Map<string, ExportJob>(),
  exportAudit: new Array<ExportAuditRecord>(),
  exportProcessing: new Map<string, Promise<void>>(),
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
