import { Stream, ActivityEvent, User } from "@/app/types/openapi";

export const db = {
  users: new Map<string, User>([
    [
      "GD7H...3J4K",
      {
        wallet_address: "GD7H...3J4K",
        email: "ada@creativestudio.io",
        display_name: "Ada Creative",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  ]),
  streams: new Map<string, Stream>([
    [
      "stream-ada",
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
      },
    ],
    [
      "stream-kemi",
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
      },
    ],
    [
      "stream-yusuf",
      {
        id: "stream-yusuf",
        recipient: "Yusuf QA Partnership",
        rate: "18 XLM / day",
        schedule: "Ended yesterday with funds available",
        status: "ended",
        nextAction: "withdraw",
        createdAt: "2026-04-15T08:00:00Z",
        updatedAt: "2026-04-27T20:00:00Z",
      },
    ],
  ]),
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
  },
];

const initialActivity: ActivityEvent[] = [
  { id: "a7383234-4224-49dc-b868-0cdf37649fda", type: "wallet.connected", timestamp: "2026-04-28T09:00:00Z", description: "Wallet connected and authenticated." },
  { id: "2b9d1d0c-bef4-46bc-a783-3073b28353fc", type: "stream.created", streamId: "stream-ada", timestamp: "2026-04-01T09:00:00Z", description: "Stream 'Design Retainer' created and set to draft." },
  { id: "d1578871-4be9-4c6a-bef5-12b2b5836478", type: "stream.started", streamId: "stream-ada", timestamp: "2026-04-01T09:05:00Z", description: "Stream 'Design Retainer' activated." },
  { id: "288f315d-5520-46e9-8acf-96994c87b786", type: "stream.created", streamId: "stream-kemi", timestamp: "2026-04-10T14:00:00Z", description: "Stream 'Kemi Onboarding Support' created as draft." },
  { id: "3bea183d-c3b5-4e96-9fbe-804f3aee49e9", type: "stream.created", streamId: "stream-yusuf", timestamp: "2026-04-15T08:00:00Z", description: "Stream 'Yusuf QA Partnership' created." },
  { id: "5ffa85da-27a4-4f7c-bde0-e5c067a28015", type: "stream.stopped", streamId: "stream-yusuf", timestamp: "2026-04-27T20:00:00Z", description: "Stream 'Yusuf QA Partnership' stopped and settled automatically." },
];

function createStreamsMap(): Map<string, Stream> {
  return new Map(initialStreams.map((stream) => [stream.id, { ...stream }]));
}

function createActivityMap(): Map<string, ActivityEvent> {
  return new Map(initialActivity.map((event) => [event.id, { ...event }]));
}

export const db = {
  streams: createStreamsMap(),
  activity: createActivityMap(),

  idempotency: new Map<string, any>(),
};

const locks = new Map<string, Promise<void>>();

/**
 * Simulates a DB-level row lock (SELECT FOR UPDATE).
 * Ensures that only one operation can proceed for a given stream ID at a time.
 */
export async function withLock<T>(id: string, callback: () => Promise<T>): Promise<T> {
  const existingLock = locks.get(id) || Promise.resolve();
  let resolveCurrent: () => void;
  const currentLock = new Promise<void>((resolve) => {
    resolveCurrent = resolve;
  });
  
  // Chain the lock
  locks.set(id, currentLock);

  try {
    await existingLock;
    return await callback();
  } finally {
    if (locks.get(id) === currentLock) {
      locks.delete(id);
    }
    resolveCurrent!();
  }
export const db = {
  streams: createInitialStreams(),
  activity: createInitialActivity(),
  idempotency: new Map<string, unknown>(),
  exportJobs: new Map<string, ExportJob>(),
  exportAudit: new Array<ExportAuditRecord>(),
  exportProcessing: new Map<string, Promise<void>>(),
};

export function idempotencyToken(scope: string, idempotencyKey: string): string {
  return `${scope}:${idempotencyKey}`;
}

export function resetDb(): void {
  db.streams.clear();
  for (const [id, stream] of createStreamsMap()) {
    db.streams.set(id, stream);
  }

  db.activity.clear();
  for (const [id, event] of createActivityMap()) {
    db.activity.set(id, event);
  }

  db.idempotency.clear();
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf8");
}
