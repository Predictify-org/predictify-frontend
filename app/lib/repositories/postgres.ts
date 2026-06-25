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
import type { Pool } from "pg";

export interface SqlExecutor {
  query<TResult = unknown>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: TResult[] }>;
}

export interface PostgresPoolConfig {
  connectionString: string;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface PostgresStoreConfig {
  executor: SqlExecutor;
}

export function createPostgresPool(config: PostgresPoolConfig): Pool {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? Number(process.env.POSTGRES_POOL_SIZE ?? 10),
    min: config.min,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  });

  return pool;
}

export function createPostgresExecutor(pool: Pool): SqlExecutor {
  return {
    query: (sql, params) => pool.query(sql, params),
  };
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

class PostgresQueuedStore {
  private pending: Promise<void> = Promise.resolve();
  private ready: Promise<void>;

  constructor(protected readonly executor: SqlExecutor) {
    this.ready = Promise.resolve();
  }

  protected schedule<T extends unknown>(work: () => Promise<T>): void {
    this.pending = this.pending
      .catch(() => undefined)
      .then(() => work())
      .then(() => undefined)
      .catch((error) => {
        console.error("PostgreSQL persistence error:", error);
      });
  }

  async drain(): Promise<void> {
    await this.ready;
    await this.pending;
  }
}

abstract class PostgresJsonKeyValueStore<K extends string, V>
  extends PostgresQueuedStore
  implements KeyValueStore<K, V>
{
  protected readonly cache = new Map<K, V>();

  constructor(executor: SqlExecutor, protected readonly table: string, protected readonly keyColumn: string) {
    super(executor);
    this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    const rows = await this.executor.query<{ key: string; payload: V }>(
      `select ${this.keyColumn} as key, payload from ${this.table}`,
    );

    this.cache.clear();
    for (const row of rows.rows) {
      this.cache.set(row.key as K, row.payload);
    }
  }

  abstract async writeUpsert(key: K, value: V): Promise<void>;
  abstract async writeClear(): Promise<void>;
  abstract async writeDelete(key: K): Promise<void>;

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.schedule(async () => this.writeClear());
  }

  delete(key: K): boolean {
    const result = this.cache.delete(key);
    this.schedule(async () => this.writeDelete(key));
    return result;
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  forEach(callbackfn: (value: V, key: K) => void): void {
    this.cache.forEach(callbackfn);
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.schedule(async () => this.writeUpsert(key, value));
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

class PostgresStreamStore extends PostgresJsonKeyValueStore<string, Stream> {
  constructor(executor: SqlExecutor) {
    super(executor, "streams", "id");
  }

  async writeUpsert(id: string, stream: Stream): Promise<void> {
    await this.executor.query(
      `insert into streams (id, status, created_at, updated_at, payload) values ($1, $2, $3, $4, $5)
       on conflict (id) do update set status = excluded.status, updated_at = excluded.updated_at, payload = excluded.payload`,
      [id, stream.status, stream.createdAt, stream.updatedAt, stream],
    );
  }

  async writeClear(): Promise<void> {
    await this.executor.query(`delete from streams`);
  }

  async writeDelete(id: string): Promise<void> {
    await this.executor.query(`delete from streams where id = $1`, [id]);
  }
}

class PostgresUserStore extends PostgresJsonKeyValueStore<string, User> {
  constructor(executor: SqlExecutor) {
    super(executor, "users", "wallet_address");
  }

  async writeUpsert(walletAddress: string, user: User): Promise<void> {
    await this.executor.query(
      `insert into users (wallet_address, created_at, payload) values ($1, $2, $3)
       on conflict (wallet_address) do update set payload = excluded.payload`,
      [walletAddress, user.created_at, user],
    );
  }

  async writeClear(): Promise<void> {
    await this.executor.query(`delete from users`);
  }

  async writeDelete(walletAddress: string): Promise<void> {
    await this.executor.query(`delete from users where wallet_address = $1`, [walletAddress]);
  }
}

class PostgresActivityStore extends PostgresJsonKeyValueStore<string, ActivityEvent> {
  constructor(executor: SqlExecutor) {
    super(executor, "activity_events", "id");
  }

  async writeUpsert(id: string, event: ActivityEvent): Promise<void> {
    await this.executor.query(
      `insert into activity_events (id, stream_id, event_type, happened_at, payload)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set stream_id = excluded.stream_id, event_type = excluded.event_type, happened_at = excluded.happened_at, payload = excluded.payload`,
      [id, (event as any).streamId ?? null, event.type, event.timestamp, event],
    );
  }

  async writeClear(): Promise<void> {
    await this.executor.query(`delete from activity_events`);
  }

  async writeDelete(id: string): Promise<void> {
    await this.executor.query(`delete from activity_events where id = $1`, [id]);
  }
}

class PostgresExportJobStore extends PostgresJsonKeyValueStore<string, ExportJob> {
  constructor(executor: SqlExecutor) {
    super(executor, "export_jobs", "id");
  }

  async writeUpsert(id: string, job: ExportJob): Promise<void> {
    await this.executor.query(
      `insert into export_jobs (id, owner_id, status, requested_at, expires_at, signed_url, signed_url_expires_at, rows, payload)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set status = excluded.status, expires_at = excluded.expires_at, signed_url = excluded.signed_url, signed_url_expires_at = excluded.signed_url_expires_at, rows = excluded.rows, payload = excluded.payload`,
      [
        id,
        job.ownerId,
        job.status,
        job.requestedAt,
        job.expiresAt,
        job.signedUrl ?? null,
        job.signedUrlExpiresAt ?? null,
        job.rows,
        job,
      ],
    );
  }

  async writeClear(): Promise<void> {
    await this.executor.query(`delete from export_jobs`);
  }

  async writeDelete(id: string): Promise<void> {
    await this.executor.query(`delete from export_jobs where id = $1`, [id]);
  }
}

class PostgresExportAuditStore implements AppendOnlyStore<ExportAuditRecord> {
  private readonly cache: ExportAuditRecord[] = [];
  private readonly pending: Promise<void>;

  constructor(private readonly executor: SqlExecutor) {
    this.pending = this.loadAll();
  }

  private async loadAll(): Promise<void> {
    const rows = await this.executor.query<{
      id: string;
      export_id: string;
      audit_type: string;
      happened_at: Date;
      details_json: unknown;
    }>(
      `select id, export_id, audit_type, happened_at, details_json from export_audit_records order by happened_at asc, id asc`,
    );

    this.cache.length = 0;
    for (const row of rows.rows) {
      this.cache.push({
        id: row.id,
        exportId: row.export_id,
        type: row.audit_type,
        timestamp: row.happened_at.toISOString(),
        details: row.details_json as Record<string, unknown> | undefined,
      });
    }
  }

  get length(): number {
    return this.cache.length;
  }

  [Symbol.iterator](): Iterator<ExportAuditRecord> {
    return this.cache[Symbol.iterator]();
  }

  clear(): void {
    this.cache.length = 0;
    this.pending.then(async () => {
      await this.executor.query(`delete from export_audit_records`);
    }).catch((error) => console.error("PostgreSQL export audit persistence error:", error));
  }

  push(value: ExportAuditRecord): number {
    this.cache.push(value);
    this.pending.then(async () => {
      await this.executor.query(
        `insert into export_audit_records (id, export_id, audit_type, happened_at, details_json)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do nothing`,
        [value.id, value.exportId, value.type, value.timestamp, value.details ?? null],
      );
    }).catch((error) => console.error("PostgreSQL export audit persistence error:", error));
    return this.cache.length;
  }

  some(predicate: (value: ExportAuditRecord, index: number, array: ExportAuditRecord[]) => boolean): boolean {
    return this.cache.some(predicate);
  }

  toArray(): ExportAuditRecord[] {
    return [...this.cache];
  }
}

class PostgresStreamRepository implements StreamRepository {
  readonly activity: KeyValueStore<string, ActivityEvent>;
  readonly streams: KeyValueStore<string, Stream>;
  readonly users: KeyValueStore<string, User>;
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly executor: SqlExecutor) {
    this.streams = new PostgresStreamStore(executor);
    this.users = new PostgresUserStore(executor);
    this.activity = new PostgresActivityStore(executor);
  }

  reset(): void {
    this.streams.clear();
    this.users.clear();
    this.activity.clear();
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

class PostgresExportRepository implements ExportRepository {
  readonly audit: AppendOnlyStore<ExportAuditRecord>;
  readonly jobs: KeyValueStore<string, ExportJob>;
  readonly processing: KeyValueStore<string, Promise<void>>;

  constructor(executor: SqlExecutor) {
    this.audit = new PostgresExportAuditStore(executor);
    this.jobs = new PostgresExportJobStore(executor);
    this.processing = new InMemoryKeyValueStore<string, Promise<void>>(new Map());
  }

  reset(): void {
    (this.jobs as PostgresExportJobStore).clear();
    (this.audit as PostgresExportAuditStore).clear();
    this.processing.clear();
  }
}

class PostgresIdempotencyStore extends PostgresQueuedStore implements IdempotencyStore {
  private readonly cache = new Map<string, unknown>();

  constructor(executor: SqlExecutor) {
    super(executor);
    this.loadAll().catch((error) => {
      console.error("PostgreSQL idempotency load error:", error);
    });
  }

  private async loadAll(): Promise<void> {
    const rows = await this.executor.query<{
      token: string;
      fingerprint: string;
      response_status: number;
      response_json: unknown;
      expires_at: Date;
    }>(
      `select token, fingerprint, response_status, response_json, expires_at from idempotency_keys`,
    );

    const now = Date.now();
    for (const row of rows.rows) {
      const expiresAt = new Date(row.expires_at).getTime();
      if (expiresAt < now) {
        await this.executor.query(`delete from idempotency_keys where token = $1`, [row.token]);
        continue;
      }

      this.cache.set(row.token, {
        fingerprint: row.fingerprint,
        response_status: row.response_status,
        response_json: row.response_json,
        expires_at: expiresAt,
      });
    }
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.schedule(async () => {
      await this.executor.query(`delete from idempotency_keys`);
    });
  }

  delete(token: string): boolean {
    const removed = this.cache.delete(token);
    this.schedule(async () => {
      await this.executor.query(`delete from idempotency_keys where token = $1`, [token]);
    });
    return removed;
  }

  entries(): IterableIterator<[string, unknown]> {
    return this.cache.entries();
  }

  forEach(callbackfn: (value: unknown, key: string) => void): void {
    this.cache.forEach(callbackfn);
  }

  get(token: string): unknown | undefined {
    const entry = this.cache.get(token) as Partial<{
      fingerprint: string;
      response_status: number;
      response_json: unknown;
      expires_at: number;
    }> | undefined;
    if (!entry) return undefined;

    if (entry.expires_at !== undefined && entry.expires_at < Date.now()) {
      this.delete(token);
      return undefined;
    }

    return entry;
  }

  has(token: string): boolean {
    return this.get(token) !== undefined;
  }

  set(token: string, value: unknown): void {
    this.cache.set(token, value);
    const entry = value as {
      fingerprint: string;
      response_status: number;
      response_json: unknown;
      expires_at: number;
    };

    this.schedule(async () => {
      await this.executor.query(
        `insert into idempotency_keys (token, fingerprint, response_status, response_json, expires_at)
         values ($1, $2, $3, $4, to_timestamp($5::double precision / 1000.0))
         on conflict (token) do update set fingerprint = excluded.fingerprint, response_status = excluded.response_status, response_json = excluded.response_json, expires_at = excluded.expires_at`,
        [token, entry.fingerprint, entry.response_status, entry.response_json, entry.expires_at],
      );
    });
  }

  reset(): void {
    this.clear();
  }

  values(): IterableIterator<unknown> {
    return this.cache.values();
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
