import type {
  AppendOnlyStore,
  ExportAuditRecord,
  ExportRepository,
  IdempotencyStore,
  KeyValueStore,
  PersistenceStore,
  StreamRepository,
} from "@/app/lib/db";
import type { ActivityEvent, ExportJob, Stream, User } from "@/app/types/openapi";

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
    token: "XLM",
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

class InMemoryKeyValueStore<K, V> implements KeyValueStore<K, V> {
  constructor(private readonly backing: Map<K, V>) {}

  get size(): number {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  delete(key: K): boolean {
    return this.backing.delete(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this.backing.entries();
  }

  forEach(callbackfn: (value: V, key: K) => void): void {
    this.backing.forEach((value, key) => callbackfn(value, key));
  }

  get(key: K): V | undefined {
    return this.backing.get(key);
  }

  has(key: K): boolean {
    return this.backing.has(key);
  }

  set(key: K, value: V): void {
    this.backing.set(key, value);
  }

  values(): IterableIterator<V> {
    return this.backing.values();
  }
}

class InMemoryAppendOnlyStore<T> implements AppendOnlyStore<T> {
  constructor(private readonly backing: T[]) {}

  get length(): number {
    return this.backing.length;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.backing[Symbol.iterator]();
  }

  clear(): void {
    this.backing.length = 0;
  }

  push(value: T): number {
    return this.backing.push(value);
  }

  some(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
    return this.backing.some(predicate);
  }

  toArray(): T[] {
    return [...this.backing];
  }
}

class InMemoryStreamRepository implements StreamRepository {
  readonly activity = new InMemoryKeyValueStore<string, ActivityEvent>(createActivityMap());
  readonly streams = new InMemoryKeyValueStore<string, Stream>(createStreamsMap());
  readonly users = new InMemoryKeyValueStore<string, User>(createUsersMap());
  private readonly locks = new Map<string, Promise<void>>();

  reset(): void {
    resetKeyValueStore(this.users, createUsersMap());
    resetKeyValueStore(this.streams, createStreamsMap());
    resetKeyValueStore(this.activity, createActivityMap());
    this.locks.clear();
  }

  async withLock<T>(id: string, callback: () => Promise<T>): Promise<T> {
    const existingLock = this.locks.get(id) ?? Promise.resolve();
    let releaseCurrent!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });

    this.locks.set(id, currentLock);

    try {
      await existingLock;
      return await callback();
    } finally {
      if (this.locks.get(id) === currentLock) {
        this.locks.delete(id);
      }
      releaseCurrent();
    }
  }
}

class InMemoryIdempotencyStore
  extends InMemoryKeyValueStore<string, unknown>
  implements IdempotencyStore
{
  constructor() {
    super(new Map<string, unknown>());
  }

  reset(): void {
    this.clear();
  }
}

class InMemoryExportRepository implements ExportRepository {
  readonly audit = new InMemoryAppendOnlyStore<ExportAuditRecord>([]);
  readonly jobs = new InMemoryKeyValueStore<string, ExportJob>(new Map<string, ExportJob>());
  readonly processing = new InMemoryKeyValueStore<string, Promise<void>>(new Map<string, Promise<void>>());

  reset(): void {
    this.jobs.clear();
    this.audit.clear();
    this.processing.clear();
  }
}

function resetKeyValueStore<K, V>(
  store: KeyValueStore<K, V>,
  nextValues: Map<K, V>,
): void {
  store.clear();
  for (const [key, value] of nextValues.entries()) {
    store.set(key, value);
  }
}

export function createInMemoryPersistenceStore(): PersistenceStore {
  return {
    kind: "memory",
    streamRepository: new InMemoryStreamRepository(),
    idempotencyStore: new InMemoryIdempotencyStore(),
    exportRepository: new InMemoryExportRepository(),
  };
}
