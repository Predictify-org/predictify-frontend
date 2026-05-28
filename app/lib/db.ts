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

export const db = {
  get activity() {
    return getStore().streamRepository.activity;
  },
  get exportAudit() {
    return getStore().exportRepository.audit;
  },
  get exportJobs() {
    return getStore().exportRepository.jobs;
  },
  get exportProcessing() {
    return getStore().exportRepository.processing;
  },
  get idempotency() {
    return getStore().idempotencyStore;
  },
  get streams() {
    return getStore().streamRepository.streams;
  },
  get users() {
    return getStore().streamRepository.users;
  },
};

export async function withLock<T>(id: string, callback: () => Promise<T>): Promise<T> {
  return getStore().streamRepository.withLock(id, callback);
}

export function idempotencyToken(scope: string, idempotencyKey: string): string {
  return `${scope}:${idempotencyKey}`;
}

/** Resets all default-store state to seed data. Use in beforeEach in tests. */
export function resetDb(): void {
  if (getStore().kind === "memory") {
    getStore().streamRepository.reset();
    getStore().idempotencyStore.reset();
    getStore().exportRepository.reset();
    return;
  }

  activeStore = createDefaultStore();
}

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

/**
 * Decode a cursor (base64-encoded stream ID).
 * Throws if cursor is malformed or not valid base64.
 */
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
