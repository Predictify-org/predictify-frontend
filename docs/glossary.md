# Glossary

Short definitions for terms used throughout the codebase. Cross-links
into deeper docs where appropriate.

## Domain

- **Stream** — an on-chain payment that vests linearly between
  `start_time` and `end_time`. See `docs/stream-state-glossary.md`.
- **Escrow** — the contract-held balance backing an active stream.
- **Sender** — the party funding the stream.
- **Recipient** — the party receiving vested funds.
- **Vesting** — the linear accrual of `total_amount` over time.
- **Settle** — terminal transition once `end_time` has passed; pays
  out any remaining vested funds.
- **Cancel** — terminal transition initiated by the sender; refunds
  unvested balance.

## Platform

- **Horizon** — Stellar's read-side REST API for ledger data.
- **Soroban** — Stellar's smart contract platform.
- **Indexer** — the worker that follows Horizon and projects stream
  lifecycle events into our DB. See `docs/horizon-indexer.md`.
- **DLQ** — dead-letter queue for failed background jobs.
- **Tenant / Organisation** — a multi-tenant boundary for streams,
  policies, and rate limits.

## Engineering

- **Idempotency key** — header on mutating requests so retries do not
  duplicate side effects.
- **Request id** — correlation id forwarded across logs and the error
  envelope.
- **Repository (in code)** — abstraction over the persistence layer;
  see `docs/persistent-store-interface.md`.
- **Circuit breaker** — pattern used in `app/lib/stellarClient.ts` to
  shed load when Horizon is unhealthy.

## See also

- `docs/stream-state-glossary.md` — state-machine specific terms.
- `docs/error-codes.md` — code-level error reference.
