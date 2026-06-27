# Changelog

All notable API changes to StreamPay are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
API versioning follows the policy in [README.md#api-versioning](README.md#api-versioning).

---

## [Unreleased]

### Added
- Request fingerprinting for fraud signals on all `/api/*` routes. Edge
  middleware computes a stable SHA-256 hash from non-volatile request signals
  (method, path, client IP, User-Agent, Accept-Language, Accept-Encoding) and
  forwards it via the internal `x-request-fingerprint` header. Fingerprint
  observations are written to the append-only audit log with correlation IDs,
  and privileged stream audit events now include `requestFingerprint` metadata.

### Fixed
- `GET /api/orgs/:orgId/members` and `POST /api/orgs/:orgId/members` now return
  `404 ORG_NOT_FOUND` when the organization does not exist, instead of an
  unhandled `500` caused by accessing an undefined legacy store.

## [2.0.0] — 2026-04-28

### Added
- `/api/v2/streams` and `/api/v2/streams/:id` — stream CRUD endpoints with
  the v2 response shape (see breaking changes below).
- `allowed_actions` array field replaces `nextAction` string, allowing a
  stream to surface multiple permitted actions simultaneously.
- Structured `settlement` object (`{ tx_hash, settled_at }`) replaces the
  flat `settlementTxHash` string; always present, `null` when not yet settled.
- `created_at` / `updated_at` snake_case date fields aligned with
  Stellar Horizon conventions (replaces `createdAt` / `updatedAt`).
- `/api/v1/*` paths now serve `Deprecation` and `Sunset` response headers
  on every response (RFC 9745).
- `/api/v1/*` will return `410 Gone` with a machine-readable body and
  migration link after **2026-12-31** (245-day notice from deprecation date).
- `docs/api-v2-migration.md` — complete migration guide for wallet partners.
- `docs/deprecation-notice-template.md` — comms template for future
  major deprecations.
- CI contract tests (`v1-contract.test.ts`) pin the v1 response shape
  for the full deprecation window.

### Breaking changes (v1 → v2)

| Field (v1) | Field (v2) | Notes |
|---|---|---|
| `nextAction: string` | `allowed_actions: string[]` | Always an array; empty when no action is available. |
| `createdAt: string` | `created_at: string` | ISO 8601, same value. |
| `updatedAt: string` | `updated_at: string` | ISO 8601, same value. |
| `settlementTxHash?: string` | `settlement: { tx_hash, settled_at } \| null` | Always present; `null` before settlement. |
| `partnerId?: string` | `partner_id?: string` | snake_case rename; value unchanged. |

### Deprecated
- `/api/streams/*` (unversioned paths) — these are the v1 handlers.
  Continue to work for the deprecation window; migrate to `/api/v2/streams/*`.
- `/api/v1/streams/*` — URL alias for the above.
- **Sunset: 2026-12-31.** After this date all `/api/v1/*` paths return
  `410 Gone`.

---

## [1.0.0] — 2026-01-15 (baseline)

Initial stable stream API release.

### Endpoints
- `GET  /api/streams` — list streams with cursor pagination
- `POST /api/streams` — create a stream (returns `draft`)
- `GET  /api/streams/:id` — get a single stream
- `DELETE /api/streams/:id` — delete a draft/ended/withdrawn stream
- `POST /api/streams/:id/start` — draft → active
- `POST /api/streams/:id/pause` — active → paused
- `POST /api/streams/:id/stop` — active|paused → ended
- `POST /api/streams/:id/settle` — active|paused → ended (with on-chain settlement)
- `POST /api/streams/:id/withdraw` — ended → withdrawn

### Response shape (v1)
```json
{
  "data": {
    "id": "stream-abc123",
    "recipient": "GABC...",
    "rate": "100 XLM / month",
    "schedule": "Pays every 30 days",
    "status": "active",
    "nextAction": "pause",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "settlementTxHash": "tx-abc..."
  },
  "links": { "self": "/api/v1/streams/stream-abc123" }
}
```

---

[Unreleased]: https://github.com/Streampay-Org/StreamPay-Frontend/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/Streampay-Org/StreamPay-Frontend/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/Streampay-Org/StreamPay-Frontend/releases/tag/v1.0.0
