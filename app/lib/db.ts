import { Stream, ActivityEvent } from "@/app/types/openapi";
import { Org, Member } from "@/app/types/org";

export const db = {
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

  orgs: new Map<string, Org>([
    ["org-1", { id: "org-1", name: "StreamPay Org", ownerWallet: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW" }]
  ]),

  members: new Map<string, Member>([
    ["org-1:GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW", { orgId: "org-1", walletAddress: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW", role: "owner" }]
  ]),

  activity: new Map<string, ActivityEvent>([
    ["a7383234-4224-49dc-b868-0cdf37649fda", { id: "a7383234-4224-49dc-b868-0cdf37649fda", type: "wallet.connected", timestamp: "2026-04-28T09:00:00Z", description: "Wallet connected and authenticated." }],
    ["2b9d1d0c-bef4-46bc-a783-3073b28353fc", { id: "2b9d1d0c-bef4-46bc-a783-3073b28353fc", type: "stream.created", streamId: "stream-ada", timestamp: "2026-04-01T09:00:00Z", description: "Stream 'Design Retainer' created and set to draft." }],
    ["d1578871-4be9-4c6a-bef5-12b2b5836478", { id: "d1578871-4be9-4c6a-bef5-12b2b5836478", type: "stream.started", streamId: "stream-ada", timestamp: "2026-04-01T09:05:00Z", description: "Stream 'Design Retainer' activated." }],
    ["288f315d-5520-46e9-8acf-96994c87b786", { id: "288f315d-5520-46e9-8acf-96994c87b786", type: "stream.created", streamId: "stream-kemi", timestamp: "2026-04-10T14:00:00Z", description: "Stream 'Kemi Onboarding Support' created as draft." }],
    ["3bea183d-c3b5-4e96-9fbe-804f3aee49e9", { id: "3bea183d-c3b5-4e96-9fbe-804f3aee49e9", type: "stream.created", streamId: "stream-yusuf", timestamp: "2026-04-15T08:00:00Z", description: "Stream 'Yusuf QA Partnership' created." }],
    ["5ffa85da-27a4-4f7c-bde0-e5c067a28015", { id: "5ffa85da-27a4-4f7c-bde0-e5c067a28015", type: "stream.stopped", streamId: "stream-yusuf", timestamp: "2026-04-27T20:00:00Z", description: "Stream 'Yusuf QA Partnership' stopped and settled automatically." }],
  ]),

  idempotency: new Map<string, unknown>(),
};
import { createHash } from "crypto";
import type { ActivityEvent, ExportJob, Stream, User } from "@/app/types/openapi";
import { createInMemoryPersistenceStore } from "@/app/lib/repositories/in-memory";
import {
  createPostgresPersistenceStore,
  POSTGRES_ROLLOUT_NOTES,
  POSTGRES_SCHEMA_SKETCH,
} from "@/app/lib/repositories/postgres";

export type { ExportJob };
export type ExportJobStatus = ExportJob["status"];

export interface ExportAuditRecord {
  id: string;
  exportId: string;
  type: "export.requested" | "export.downloaded" | "export.expired";
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface KeyValueStore<K, V> {
  readonly size: number;
  clear(): void;
  delete(key: K): boolean;
  entries(): IterableIterator<[K, V]>;
  forEach(callbackfn: (value: V, key: K) => void): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): void;
  values(): IterableIterator<V>;
}

export interface AppendOnlyStore<T> extends Iterable<T> {
  readonly length: number;
  clear(): void;
  push(value: T): number;
  some(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
  toArray(): T[];
}

export interface StreamRepository {
  readonly activity: KeyValueStore<string, ActivityEvent>;
  readonly streams: KeyValueStore<string, Stream>;
  readonly users: KeyValueStore<string, User>;
  reset(): void;
  withLock<T>(id: string, callback: () => Promise<T>): Promise<T>;
}

export interface IdempotencyStore extends KeyValueStore<string, unknown> {
  reset(): void;
}

export interface ExportRepository {
  readonly audit: AppendOnlyStore<ExportAuditRecord>;
  readonly jobs: KeyValueStore<string, ExportJob>;
  readonly processing: KeyValueStore<string, Promise<void>>;
  reset(): void;
}

export interface PersistenceStore {
  readonly exportRepository: ExportRepository;
  readonly idempotencyStore: IdempotencyStore;
  readonly kind: "memory" | "postgres";
  readonly streamRepository: StreamRepository;
}

let activeStore: PersistenceStore = createInMemoryPersistenceStore();

export function getStore(): PersistenceStore {
  return activeStore;
}

export function setStore(store: PersistenceStore): void {
  activeStore = store;
}

export function createDefaultStore(): PersistenceStore {
  return createInMemoryPersistenceStore();
}

function createStoreProxy<T>(storeGetter: () => KeyValueStore<string, T>, extraProps?: Record<string, any>) {
  return new Proxy({} as any, {
    get(target, prop, receiver) {
      const store = storeGetter();
      if (extraProps && prop in extraProps) {
        return extraProps[prop as string];
      }
      if (prop in store || typeof (store as any)[prop] === 'function') {
        const value = (store as any)[prop];
        if (typeof value === 'function') {
          return value.bind(store);
        }
        return value;
      }
      if (typeof prop === 'string') {
        return store.get(prop);
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const store = storeGetter();
      if (typeof prop === 'string') {
        store.set(prop, value);
        return true;
      }
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      const store = storeGetter();
      if (typeof prop === 'string') {
        return store.delete(prop);
      }
      return false;
    },
    has(target, prop) {
      const store = storeGetter();
      if (typeof prop === 'string') {
        return store.has(prop);
      }
      return false;
    },
    ownKeys() {
      const store = storeGetter();
      const keys: string[] = [];
      store.forEach((_, key) => {
        keys.push(key);
      });
      return keys;
    },
    getOwnPropertyDescriptor(target, prop) {
      const store = storeGetter();
      if (typeof prop === 'string' && store.has(prop)) {
        return {
          value: store.get(prop),
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    }
  });
}

export const db = {
  get activity() {
    return createStoreProxy(() => getStore().streamRepository.activity);
  },
  get exportAudit() {
    return getStore().exportRepository.audit;
  },
  get exportJobs() {
    return createStoreProxy(() => getStore().exportRepository.jobs);
  },
  get exportProcessing() {
    return createStoreProxy(() => getStore().exportRepository.processing);
  },
  get idempotency() {
    return createStoreProxy(() => getStore().idempotencyStore);
  },
  get idempotencyKeys() {
    return createStoreProxy(() => getStore().idempotencyStore);
  },
  get streams() {
    return createStoreProxy(() => getStore().streamRepository.streams, {
      findOne: (tenant: string, id: string) => {
        const store = getStore().streamRepository.streams;
        const row = store.get(id);
        if (!row) return null;
        return (row as any).tenant === tenant ? row : null;
      }
    });
  },
  get users() {
    return createStoreProxy(() => getStore().streamRepository.users);
  },
} as any;

export async function withLock<T>(id: string, callback: () => Promise<T>): Promise<T> {
  return getStore().streamRepository.withLock(id, callback);
}

// ── Idempotency types ──────────────────────────────────────────────────────────

/** Internal envelope stored in the idempotency store for each token. */
export interface IdempotencyEntry {
  /** SHA-256 hex fingerprint of (method, path, sorted JSON body). */
  readonly fingerprint: string;
  /** Epoch ms when this entry expires and may be lazily evicted. */
  readonly expiresAt: number;
  /** HTTP status code to replay. */
  readonly status: number;
  /** JSON-serialisable response body to replay. */
  readonly body: unknown;
}

export type IdempotencyCheckResult =
  | { readonly ok: true; readonly status: number; readonly body: unknown }
  | { readonly ok: false; readonly conflict: true };

/** Default TTL: 24 hours in milliseconds. */
export const IDEMPOTENCY_TTL_MS = 86_400_000;

/**
 * Deterministic fingerprint for a request tuple.
 * Uses the same deterministic JSON serialisation as the rest of the stack.
 */
export function computeFingerprint(method: string, path: string, body: unknown): string {
  const normalised = JSON.stringify(body ?? null);
  const payload = `${method}:${path}:${normalised}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Check whether a token has a cached entry.
 *
 * Returns one of:
 * - `null`       → no cached entry (caller should process the request).
 * - `{ok:true,…}`→ identical replay — return the cached body with its status.
 * - `{ok:false,conflict:true}` → fingerprint mismatch → return 409.
 *
 * **Lazy eviction** – expired entries are deleted on read so callers do not
 * need a background sweep.
 */
export function checkIdempotency(
  store: KeyValueStore<string, unknown>,
  token: string,
  fingerprint: string,
): IdempotencyCheckResult | null {
  const raw = store.get(token);
  if (raw === undefined) return null;

  const entry = raw as Partial<IdempotencyEntry>;

  // Guard against malformed entries (e.g. old-format raw payloads or
  // corrupt data). Treat them as expired and evict.
  if (typeof entry?.fingerprint !== "string" || typeof entry?.expiresAt !== "number") {
    store.delete(token);
    return null;
  }

  // Lazy eviction – token has expired.
  if (entry.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }

  // Conflict – same key, different request.
  if (entry.fingerprint !== fingerprint) {
    return { ok: false, conflict: true };
  }

  return { ok: true, status: entry.status, body: entry.body };
}

/**
 * Persist a successful response under `token` so that identical replays can be
 * served from cache rather than re-executing the action.
 */
export function setIdempotency(
  store: KeyValueStore<string, unknown>,
  token: string,
  fingerprint: string,
  status: number,
  body: unknown,
): void {
  const entry: IdempotencyEntry = {
    fingerprint,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    status,
    body,
  };
  store.set(token, entry);
}

export function idempotencyToken(scope: string, idempotencyKey: string): string {
  return `${scope}:${idempotencyKey}`;
}

export function resetDb(
  streams?: Record<string, Stream>,
  idempotencyKeys?: Record<string, any>,
): void {
  const store = getStore();
  if (store.kind === "memory") {
    store.streamRepository.reset();
    store.idempotencyStore.reset();
    store.exportRepository.reset();
  } else {
    activeStore = createDefaultStore();
  }

  if (streams) {
    for (const [id, stream] of Object.entries(streams)) {
      getStore().streamRepository.streams.set(id, stream);
    }
  }
  if (idempotencyKeys) {
    for (const [key, value] of Object.entries(idempotencyKeys)) {
      getStore().idempotencyStore.set(key, value);
    }
  }
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

export function decodeCursor(cursor: string): string {
  if (!cursor || typeof cursor !== "string") {
    throw new Error("Invalid cursor: must be non-empty string");
  }
  try {
    return Buffer.from(cursor, "base64").toString("utf8");
  } catch {
    throw new Error("Invalid cursor: malformed base64");
  }
}

export { createInMemoryPersistenceStore, createPostgresPersistenceStore, POSTGRES_SCHEMA_SKETCH, POSTGRES_ROLLOUT_NOTES };
