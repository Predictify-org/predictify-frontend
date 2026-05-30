# StreamPay API v2 Migration Guide

> **Deadline: 2026-12-31** — v1 endpoints will return `410 Gone` after this date.  
> Questions? Open a GitHub issue or email partner-support@streampay.io.

---

## Overview

API v2 introduces three breaking changes to the stream response shape, all
motivated by alignment with Stellar/Horizon field naming conventions and
the need to support multi-action states in future Soroban escrow contracts.

All other behaviour — authentication, idempotency, rate limits, error codes,
pagination — is unchanged.

---

## Base URL change

| Version | Base path |
|---------|-----------|
| v1 | `/api/streams/…` or `/api/v1/streams/…` |
| v2 | `/api/v2/streams/…` |

Both accept the same auth headers (`Authorization: Bearer <jwt>`).

---

## Breaking change 1 — `nextAction` → `allowed_actions`

**Why:** Soroban multi-sig states can permit more than one action at a time.
A string field cannot express this. `allowed_actions` is always an array,
which is safe to iterate regardless of how many actions are available.

**v1 shape**
```json
{
  "nextAction": "pause"
}
```

**v2 shape**
```json
{
  "allowed_actions": ["pause"]
}
```

When no action is currently available (e.g. a `withdrawn` stream):
- v1: `nextAction` is absent or `undefined`
- v2: `allowed_actions: []` (empty array — always present)

**Migration**

```diff
- const canPause = stream.nextAction === "pause";
+ const canPause = stream.allowed_actions.includes("pause");

- if (stream.nextAction) { showActionButton(stream.nextAction); }
+ stream.allowed_actions.forEach(action => showActionButton(action));
```

---

## Breaking change 2 — camelCase dates → snake_case

**Why:** Stellar Horizon API uses snake_case for all timestamp fields.
Aligning StreamPay v2 removes the impedance mismatch for wallet SDKs
that parse Horizon and StreamPay responses in the same pipeline.

| v1 field | v2 field | Value |
|---|---|---|
| `createdAt` | `created_at` | ISO 8601 UTC, unchanged |
| `updatedAt` | `updated_at` | ISO 8601 UTC, unchanged |

**v1 shape**
```json
{
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-03-01T14:30:00.000Z"
}
```

**v2 shape**
```json
{
  "created_at": "2026-01-15T10:00:00.000Z",
  "updated_at": "2026-03-01T14:30:00.000Z"
}
```

**Migration**

```diff
- const age = Date.now() - new Date(stream.createdAt).getTime();
+ const age = Date.now() - new Date(stream.created_at).getTime();

- displayDate(stream.updatedAt);
+ displayDate(stream.updated_at);
```

The same rename applies to `partnerId` → `partner_id`.

---

## Breaking change 3 — `settlementTxHash` → `settlement` object

**Why:** The v1 field is absent before settlement and present after, making
it ambiguous whether absence means "not settled" or "field removed." v2
uses an explicit `null` value before settlement and a structured object
after, which is easier to type-check and forward to Horizon lookup logic.

**v1 shape (before settlement)**
```json
{
  "settlementTxHash": undefined
}
```

**v1 shape (after settlement)**
```json
{
  "settlementTxHash": "c3f8a12e4b76..."
}
```

**v2 shape (before settlement)**
```json
{
  "settlement": null
}
```

**v2 shape (after settlement)**
```json
{
  "settlement": {
    "tx_hash": "c3f8a12e4b76...",
    "settled_at": "2026-03-01T14:30:00.000Z"
  }
}
```

**Migration**

```diff
- if (stream.settlementTxHash) {
-   lookupOnHorizon(stream.settlementTxHash);
- }
+ if (stream.settlement) {
+   lookupOnHorizon(stream.settlement.tx_hash);
+ }
```

---

## Deprecation headers on v1 responses

During the deprecation window, every v1 response includes:

```
Deprecation: Mon, 28 Apr 2026 00:00:00 GMT
Sunset: Thu, 31 Dec 2026 00:00:00 GMT
Link: <https://docs.streampay.io/api/v2-migration>; rel="successor-version"
```

These headers follow [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745).
Monitoring tools that understand RFC 9745 will surface the deprecation
automatically.

---

## After the sunset date (post-2026-12-31)

All `/api/v1/*` paths return `410 Gone`:

```json
{
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API v1 reached end-of-life on 2026-12-31T00:00:00.000Z. Please migrate to v2.",
    "migration_url": "https://docs.streampay.io/api/v2-migration",
    "sunset_at": "2026-12-31T00:00:00.000Z"
  }
}
```

---

## Checklist for wallet partners

- [ ] Replace `/api/streams/` with `/api/v2/streams/` in all request URLs
- [ ] Replace `stream.nextAction` checks with `stream.allowed_actions.includes(…)`
- [ ] Replace `stream.createdAt` / `stream.updatedAt` with `stream.created_at` / `stream.updated_at`
- [ ] Replace `stream.settlementTxHash` checks with `stream.settlement?.tx_hash`
- [ ] Replace `stream.partnerId` with `stream.partner_id`
- [ ] Update any TypeScript interfaces or generated SDK types
- [ ] Add monitoring for the `Sunset` response header (RFC 9745)
- [ ] Test against `/api/v2/streams` in staging before the deadline

---

## Soroban/escrow fields (upcoming)

Additional fields for on-chain escrow balances (`escrow_balance`,
`velocity`, `last_update_ledger`) are under design and will be tracked
in a child issue. They will be additive additions to v2 and will not
require a v3.
