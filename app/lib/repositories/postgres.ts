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

export interface SqlExecutor {
  query<TResult = unknown>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: TResult[] }>;
}

export interface PostgresStoreConfig {
  executor: SqlExecutor;
}

export const POSTGRES_SCHEMA_SKETCH = `
-- Streams remain the source of truth for lifecycle state.
create table streams (
  id text primary key,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  payload jsonb not null
);

create index streams_status_created_at_idx on streams (status, created_at, id);

create table users (
  wallet_address text primary key,
  created_at timestamptz not null,
  payload jsonb not null
);

create table activity_events (
  id text primary key,
  stream_id text null references streams(id) on delete set null,
  event_type text not null,
  happened_at timestamptz not null,
  payload jsonb not null
);

create index activity_events_stream_happened_at_idx
  on activity_events (stream_id, happened_at desc, id desc);

create index activity_events_type_happened_at_idx
  on activity_events (event_type, happened_at desc, id desc);

create table idempotency_keys (
  token text primary key,
  fingerprint text not null,
  response_status integer not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idempotency_keys_expires_at_idx on idempotency_keys (expires_at);
create index idempotency_keys_fingerprint_idx on idempotency_keys (fingerprint);

create table export_jobs (
  id text primary key,
  owner_id text not null,
  status text not null,
  requested_at timestamptz not null,
  expires_at timestamptz not null,
  signed_url text null,
  signed_url_expires_at timestamptz null,
  rows integer not null default 0,
  payload jsonb not null
);

create index export_jobs_owner_requested_at_idx
  on export_jobs (owner_id, requested_at desc, id desc);

create table export_audit_records (
  id text primary key,
  export_id text not null references export_jobs(id) on delete cascade,
  audit_type text not null,
  happened_at timestamptz not null,
  details_json jsonb null
);

create index export_audit_records_export_happened_at_idx
  on export_audit_records (export_id, happened_at desc, id desc);

-- Lock semantics should use pg_advisory_xact_lock(hashtext(stream_id))
-- or an equivalent row-level lease table so cross-instance settles and
-- withdraws preserve the current single-writer behavior.
`;

export const POSTGRES_ROLLOUT_NOTES = [
  "Ship the repository interface with the in-memory adapter as default so all routes stay backward compatible.",
  "Create additive SQL tables first; write dual-read tests against the in-memory adapter before turning on any durable writes.",
  "Backfill seeded and runtime stream state into PostgreSQL, then dual-write streams, idempotency tokens, and export jobs during the migration window.",
  "Switch reads route-by-route behind a feature flag after parity checks confirm cursor ordering, lock behavior, and idempotency replay match the in-memory adapter.",
  "Keep idempotency keys on a retention/TTL policy in the durable store so replay safety is preserved without unbounded growth.",
];

class UnsupportedKeyValueStore<K, V> implements KeyValueStore<K, V> {
  constructor(private readonly resourceName: string) {}

  get size(): number {
    throw unsupported(this.resourceName, "size");
  }

  clear(): void {
    throw unsupported(this.resourceName, "clear");
  }

  delete(_key: K): boolean {
    throw unsupported(this.resourceName, "delete");
  }

  entries(): IterableIterator<[K, V]> {
    throw unsupported(this.resourceName, "entries");
  }

  forEach(_callbackfn: (value: V, key: K) => void): void {
    throw unsupported(this.resourceName, "forEach");
  }

  get(_key: K): V | undefined {
    throw unsupported(this.resourceName, "get");
  }

  has(_key: K): boolean {
    throw unsupported(this.resourceName, "has");
  }

  set(_key: K, _value: V): void {
    throw unsupported(this.resourceName, "set");
  }

  values(): IterableIterator<V> {
    throw unsupported(this.resourceName, "values");
  }
}

class UnsupportedAppendOnlyStore<T> implements AppendOnlyStore<T> {
  constructor(private readonly resourceName: string) {}

  get length(): number {
    throw unsupported(this.resourceName, "length");
  }

  [Symbol.iterator](): Iterator<T> {
    throw unsupported(this.resourceName, "iterator");
  }

  clear(): void {
    throw unsupported(this.resourceName, "clear");
  }

  push(_value: T): number {
    throw unsupported(this.resourceName, "push");
  }

  some(_predicate: (value: T, index: number, array: T[]) => boolean): boolean {
    throw unsupported(this.resourceName, "some");
  }

  toArray(): T[] {
    throw unsupported(this.resourceName, "toArray");
  }
}

class PostgresStreamRepository implements StreamRepository {
  readonly activity: KeyValueStore<string, ActivityEvent>;
  readonly streams: KeyValueStore<string, Stream>;
  readonly users: KeyValueStore<string, User>;

  constructor(private readonly executor: SqlExecutor) {
    void this.executor;
    this.activity = new UnsupportedKeyValueStore<string, ActivityEvent>("activity_events");
    this.streams = new UnsupportedKeyValueStore<string, Stream>("streams");
    this.users = new UnsupportedKeyValueStore<string, User>("users");
  }

  reset(): void {
    throw unsupported("postgres-stream-repository", "reset");
  }

  async withLock<T>(_id: string, _callback: () => Promise<T>): Promise<T> {
    throw unsupported("postgres-stream-repository", "withLock");
  }
}

class PostgresIdempotencyStore
  extends UnsupportedKeyValueStore<string, unknown>
  implements IdempotencyStore
{
  constructor(executor: SqlExecutor) {
    void executor;
    super("idempotency_keys");
  }

  reset(): void {
    throw unsupported("postgres-idempotency-store", "reset");
  }
}

class PostgresExportRepository implements ExportRepository {
  readonly audit: AppendOnlyStore<ExportAuditRecord>;
  readonly jobs: KeyValueStore<string, ExportJob>;
  readonly processing: KeyValueStore<string, Promise<void>>;

  constructor(private readonly executor: SqlExecutor) {
    void this.executor;
    this.audit = new UnsupportedAppendOnlyStore<ExportAuditRecord>("export_audit_records");
    this.jobs = new UnsupportedKeyValueStore<string, ExportJob>("export_jobs");
    this.processing = new UnsupportedKeyValueStore<string, Promise<void>>("export_job_processing");
  }

  reset(): void {
    throw unsupported("postgres-export-repository", "reset");
  }
}

function unsupported(resourceName: string, methodName: string): Error {
  return new Error(
    `PostgreSQL persistence seam is defined, but ${resourceName}.${methodName} is not wired yet.`,
  );
}

export function createPostgresPersistenceStore(
  config: PostgresStoreConfig,
): PersistenceStore {
  return {
    kind: "postgres",
    streamRepository: new PostgresStreamRepository(config.executor),
    idempotencyStore: new PostgresIdempotencyStore(config.executor),
    exportRepository: new PostgresExportRepository(config.executor),
  };
}
