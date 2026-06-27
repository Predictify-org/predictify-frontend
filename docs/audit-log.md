# Immutable Audit Log for Privileged and Financial Actions

StreamPay now records a tamper-evident, append-only audit record for privileged stream operations that can move money or bypass normal flow controls.

## Covered actions

- `stream.stop.override`
- `stream.settle`
- `stream.withdraw`

Each entry records:

- actor id and role
- target stream id and account label
- action name
- before/after hashes and a diff hash
- timestamp
- request id
- previous-entry hash and current-entry hash

## Retention

- Default retention: **30 days**
- Expired entries are archived to cold storage by the daily retention job before they are removed from the active append-only store.
- The API returns `retentionDays` for JSON reads and `x-audit-retention-days`
  for NDJSON exports.
- The store exposes `archiveExpiredEntries()` and `restoreArchivedEntries()` so
  archived records can be restored without changing the existing hash-chain
  values.
- Retention cleanup is performed with the admin CLI, not through the public API:

```bash
# Dry-run rows older than the retention window
npx ts-node scripts/purge-audit.ts --older-than-days 2555

# Execute the purge after reviewing the dry-run output
npx ts-node scripts/purge-audit.ts --older-than-days 2555 --execute
```

The CLI prints a JSON result containing the cutoff timestamp, purge count,
retained count, request id, and before/after hash-chain integrity flags.

## Access matrix

| Role | Read `/api/audit` | Export `?export=ndjson` |
| --- | --- | --- |
| `support` | Yes | No |
| `finance` | Yes | No |
| `admin` | Yes | Yes |
| `security` | Yes | Yes |
| `compliance` | Yes | Yes |
| `user` | No | No |

## Export redaction

Incident-response exports redact target account labels to a masked form such as `acct***demo`.

- Included: actor id, actor role, target stream id, redacted account, action, request id, timestamp, hash chain
- Excluded from export: raw before/after payloads and unredacted target account labels

This keeps exports useful for investigations without leaking unnecessary PII into shared files.

## Synthetic sample lines

```json
{"id":"audit-sample-1","actorId":"ops-admin-17","actorRole":"admin","targetType":"stream","targetId":"stream-ada","redactedTargetAccount":"Ada ***udio","action":"stream.settle","beforeHash":"9ac3...","afterHash":"8fb2...","diffHash":"7c7a...","requestId":"req-demo-1","timestamp":"2026-04-28T10:42:15.000Z","prevHash":"a0cf...","entryHash":"91fe...","retentionUntil":"2033-04-27T10:42:15.000Z","metadata":{"settlementTxHash":"fake-tx-13af7b20"},"redactionPolicy":"mask-target-account"}
{"id":"audit-sample-2","actorId":"support-supervisor-4","actorRole":"support","targetType":"stream","targetId":"stream-kemi","redactedTargetAccount":"Kemi***port","action":"stream.stop.override","beforeHash":"f3c2...","afterHash":"a019...","diffHash":"98d1...","requestId":"req-demo-2","timestamp":"2026-04-28T11:03:09.000Z","prevHash":"91fe...","entryHash":"c0aa...","retentionUntil":"2033-04-27T11:03:09.000Z","metadata":{"resultingStatus":"ended"},"redactionPolicy":"mask-target-account"}
```

## Notes and intentional exclusions

- The current implementation uses an in-memory append-only store because this repo is a frontend/mock API surface. A production deployment should mirror each write to an external immutable sink such as S3 object lock or a warehouse table with write-once controls.
- No API exists to mutate or delete audit records. Retention purges are limited
  to the admin CLI and should only run after archived records have crossed the
  configured retention window.
- Search is available by actor id, role, action, target id, request id, and free-text query.
