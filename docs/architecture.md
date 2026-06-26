# Architecture Overview

This document gives a high-level map of the StreamPay frontend. It is a
quick reference for new contributors; the authoritative details live in
the individual module docs under `docs/`.

## Top-level layout

```
app/            Next.js App Router (UI + API routes)
  api/          Route handlers (REST surface)
  components/   React components shared across pages
  lib/          Server-side helpers used by route handlers
lib/            Shared client helpers (apiClient, indexer)
contracts/      Soroban smart contract source (Rust)
docs/           Long-form documentation and runbooks
design/         Design tokens, mocks, handoff notes
scripts/        One-off and recurring operations scripts
```

## Request flow

1. Browser issues a request to `/api/v2/streams/...`.
2. The route handler in `app/api/...` validates input, calls a
   repository in `app/lib/repositories/`, and returns an error envelope
   on failure.
3. Repositories sit behind a pluggable interface so we can swap the
   default in-memory store for a durable backend later.
4. Stellar / Soroban interactions are funneled through
   `app/lib/stellarClient.ts`, which adds caching, circuit breaking,
   and concurrency limits.

## Contract layer

The Soroban contract under `contracts/contracts/streampay-stream/`
encodes the on-chain stream lifecycle: create, start, pause, resume,
withdraw, settle, cancel. The frontend never trusts a single read of
chain state — it reconciles via the Horizon indexer in `lib/indexer.ts`.

## Where to look next

- `docs/api-v2-migration.md` — v1 to v2 field mapping.
- `docs/persistent-store-interface.md` — repository seam plan.
- `docs/horizon-indexer.md` — chain event indexer design.
- `docs/STATE_MACHINE.md` — stream state transitions.
