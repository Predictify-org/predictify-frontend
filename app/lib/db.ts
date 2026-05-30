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
