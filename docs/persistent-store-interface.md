# Persistent Store Interface

Issue #249 introduces a persistence seam for backend state that was previously
kept only in process memory.

## Interfaces

`app/lib/db.ts` now defines three backend-facing interfaces:

- `StreamRepository`
  - owns stream records, user records, activity events, and per-stream lock semantics
- `IdempotencyStore`
  - owns replay tokens and cached idempotent responses
- `ExportRepository`
  - owns export jobs, export audit records, and async export processing state

The default runtime store is still the in-memory adapter so existing local and
test flows remain backward compatible.

## Adapters

Adapters live in `app/lib/repositories/`:

- `in-memory.ts`
  - default adapter backed by `Map`s and an in-process lock queue
- `postgres.ts`
  - durable adapter seam with a PostgreSQL-oriented schema sketch and rollout notes

The PostgreSQL adapter is intentionally a seam, not a live cutover. It gives
the route layer a stable contract before the SQL migration track is wired in.

## Lock, Cursor, and Idempotency Semantics

The refactor preserves the existing behavior:

- `withLock(streamId, callback)` still serializes concurrent settle/withdraw
  work per stream ID
- `encodeCursor` and `decodeCursor` remain base64 wrappers over stable record IDs
- `idempotencyToken(scope, key)` remains the canonical replay token format

## PostgreSQL Schema Sketch

The durable adapter exports `POSTGRES_SCHEMA_SKETCH` in
`app/lib/repositories/postgres.ts`.

Highlights:

- `streams`
  - canonical stream lifecycle state
  - indexed by `(status, created_at, id)` for cursor-friendly listing
- `users`
  - wallet-address keyed user records
- `activity_events`
  - append-only stream/activity history
  - indexed for stream-scoped and type-scoped pagination
- `idempotency_keys`
  - cached response payloads with an optional expiry/TTL column
- `export_jobs`
  - async export lifecycle state per tenant
- `export_audit_records`
  - append-only audit trail for request/download/expiry events

Locking should move to transaction-scoped PostgreSQL advisory locks or an
equivalent lease mechanism so cross-instance writers preserve the current
single-writer settle/withdraw behavior.

## Rollout Notes

The durable migration path is designed to be backward compatible:

1. Land the interface and keep the in-memory adapter as the default.
2. Create additive SQL tables first; do not switch reads yet.
3. Backfill stream, idempotency, and export state into PostgreSQL.
4. Dual-write during the migration window.
5. Cut reads over behind a feature flag after parity checks confirm:
   - cursor ordering is unchanged
   - idempotency replay returns the same payloads
   - per-stream lock semantics still prevent double settle/withdraw

This sequencing aligns with the existing SQL migration track by separating the
contract change from the storage cutover.
