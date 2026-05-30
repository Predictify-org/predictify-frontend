# ADR 0001 — Temporal (or equivalent durable workflow engine) for long-lived stream schedules

**Status:** Proposed  
**Date:** 2026-04-28  
**Deciders:** Engineering team  
**Spike branch:** `spike/temporal-streams`

---

## Context

StreamPay streams accrue value over days or months and settle on Soroban. The current
(planned) approach is **BullMQ + cron**: a cron job enqueues a tick job for every active
stream at each interval; a worker processes the queue and calls the Soroban contract.

This spike evaluates whether a **durable workflow engine** (Temporal, AWS Step Functions,
or equivalent) is a better fit for the following properties:

- Streams run for 1 day – 12 months.
- Each stream has its own tick cadence (hourly, daily, monthly).
- A tick must be idempotent: double-processing must not double-settle.
- Missed ticks (e.g. worker restart) must be caught up, not silently dropped.
- Soroban settlement is an external async call that can fail transiently.

---

## Decision drivers

| Driver | Weight |
|---|---|
| Missed-tick safety | High |
| Idempotency guarantees | High |
| Operational complexity | Medium |
| Cost at scale (10k streams) | Medium |
| Worker identity / secret handling | High |
| Time to production | Medium |

---

## Options considered

### Option A — Keep BullMQ + cron (status quo)

A cron job runs every tick interval and enqueues one job per active stream.
Workers consume the queue and call Soroban.

**Pros**
- Already understood by the team; no new infrastructure.
- BullMQ has built-in retry and delay.
- Low operational overhead for < 1 000 streams.

**Cons**
- Cron is a single point of failure; if it misses a run, ticks are silently dropped.
- No built-in "catch-up" for streams that were paused or the worker was down.
- Idempotency must be hand-rolled (deduplication key per tick).
- Long-running streams (months) require keeping jobs alive or re-enqueuing on resume —
  both are error-prone.
- No native child-workflow concept; fan-out logic lives in application code.

**Risks of staying on cron**
- **Missed tick:** If the cron process crashes between runs, the tick is lost. BullMQ
  delayed jobs mitigate this only if the job was already enqueued before the crash.
- **Idempotency:** Without a durable tick ID, a worker restart can re-process the same
  tick. Must be guarded by a DB unique constraint on `(stream_id, tick_sequence)`.
- **Resume gap:** When a paused stream resumes, the gap in accrual must be computed
  manually. No engine-level support.
- **Observability:** Debugging a missed tick requires correlating cron logs, queue
  metrics, and DB state across three systems.

---

### Option B — Temporal

Each stream gets a **child workflow** that loops: settle → sleep-until-next-tick → repeat.
The parent workflow manages the stream lifecycle (create, pause, resume, stop).

**Pros**
- Durable timers: `workflow.sleep` survives worker restarts; no tick is ever lost.
- Built-in catch-up: if a worker was down, Temporal replays history and resumes from
  the correct point.
- Idempotency is structural: each workflow execution has a unique ID; Temporal deduplicates
  at the engine level.
- Child workflows map naturally to "one stream = one workflow"; fan-out is first-class.
- Signals (`pause`, `resume`, `stop`) are atomic and durable.
- Rich UI for debugging workflow history.

**Cons**
- New infrastructure: Temporal server (self-hosted or Temporal Cloud).
- Workers need a Temporal SDK dependency (`@temporalio/worker`, `@temporalio/workflow`).
- Workflow code has determinism constraints (no `Date.now()`, no random, no direct I/O
  inside workflow functions).
- Temporal Cloud cost: ~$0.00025 per workflow action; at 10k streams × 30 ticks/day =
  300k actions/day ≈ $75/day ($2 250/month). Self-hosted eliminates this but adds ops.
- Worker identity: workers must authenticate to Temporal server (mTLS or API key);
  Soroban signing keys must be injected via env/secrets manager, not workflow state.

**Cons — operational**
- Requires running Temporal server (or paying for Cloud).
- Workflow versioning is non-trivial; breaking changes require `patched` API.
- Team must learn Temporal's determinism model.

---

### Option C — AWS Step Functions

Similar durable-execution model to Temporal but managed by AWS.

**Pros**
- Fully managed; no server to run.
- Native AWS IAM for worker identity.
- Express Workflows support high-throughput (up to 100k executions/sec).

**Cons**
- Vendor lock-in to AWS.
- Maximum execution duration: 1 year (Standard) — sufficient, but a hard limit.
- Cost: $0.025 per 1 000 state transitions; at 300k/day ≈ $7.50/day ($225/month) —
  cheaper than Temporal Cloud at this scale.
- No equivalent of Temporal's `continueAsNew` for truly unbounded streams; must chain
  executions manually.
- Less ergonomic for TypeScript than Temporal SDK.

---

## Recommendation: **Not build (yet) — stay on BullMQ + cron with hardened idempotency**

### Rationale

At the current scale (< 1 000 streams, sub-daily ticks), the operational cost of
introducing Temporal or Step Functions outweighs the reliability gain. The risks of
BullMQ + cron are **mitigatable** with targeted hardening:

1. **Missed-tick guard:** Store a `next_tick_at` timestamp per stream in the DB. On
   worker startup and on each cron run, query for streams where `next_tick_at <= now`
   and enqueue any that were missed. This closes the crash-gap without a new engine.

2. **Idempotency:** Use a DB unique constraint on `(stream_id, tick_sequence_number)`.
   The worker increments the sequence only after a confirmed Soroban receipt. Retries
   are safe.

3. **Resume gap:** On resume, compute accrued-but-unsettled ticks from
   `paused_at` → `resumed_at` and enqueue them as catch-up jobs with the correct
   sequence numbers.

4. **Observability:** Emit structured logs with `stream_id`, `tick_seq`, `settled_at`,
   `tx_hash`. A single query surfaces any gap.

### Revisit trigger

Adopt Temporal (or Step Functions) when **any** of the following is true:

- Active streams exceed 10 000 and cron fan-out latency becomes measurable.
- Monthly-cadence streams require sub-second precision on tick boundaries.
- The team adds a second workflow type (e.g. escrow release, dispute resolution) that
  would benefit from the same engine.
- A production missed-tick incident occurs despite the hardening above.

### If approved in future

Prefer **Temporal** over Step Functions for:
- TypeScript-native SDK with strong typing.
- Self-hostable (avoids AWS lock-in).
- Child-workflow model maps directly to "one stream = one workflow".

See `spike/temporal/` for prototype implementations of both patterns.

---

## Prototype summary

Two prototype workflows are in `spike/temporal/`:

| File | Pattern | Description |
|---|---|---|
| `sleep-until-workflow.ts` | Sleep-until tick | Single stream: settle → sleep → repeat |
| `child-workflow.ts` | Child per stream | Parent manages lifecycle; child handles ticks |
| `workflow-logic.ts` | Pure logic | Tick scheduling math, extracted for testing |
| `workflow-logic.test.ts` | Tests | 100% coverage on pure logic |

The prototypes use the Temporal SDK type signatures but **do not require a running
Temporal server** — the pure logic is tested in isolation. Full integration would
require `npm install @temporalio/workflow @temporalio/worker @temporalio/client`.

---

## Security notes

- **Worker identity:** Temporal workers authenticate via mTLS certificates or API keys.
  These must be injected at runtime (env var / secrets manager), never hardcoded or
  committed.
- **Soroban signing keys:** Must live in the worker process environment, not in workflow
  state. Workflow state is persisted by Temporal and must be treated as potentially
  observable.
- **Network egress:** Workers need outbound access to Temporal server and Horizon/Soroban
  RPC. Restrict with egress firewall rules; no other outbound traffic needed.
- **PII:** Stream metadata (sender, recipient, amount) flows through workflow history.
  If Temporal Cloud is used, review data residency requirements. Self-hosted avoids this.
- **Replay safety:** Workflow code must be deterministic. Any secret or key material
  must be accessed via Activities (not workflow functions) to avoid leaking into
  replay logs.

---

## References

- [Temporal documentation](https://docs.temporal.io)
- [AWS Step Functions pricing](https://aws.amazon.com/step-functions/pricing/)
- [BullMQ documentation](https://docs.bullmq.io)
- Prototype: `spike/temporal/`
