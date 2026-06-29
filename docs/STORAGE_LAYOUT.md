# Contract Storage Layout

This document describes the on-chain storage keys and TTL (time-to-live)
tiers used by the `streampay-stream` Soroban contract. It is the canonical
reference for the storage model and must be kept in sync with
`contracts/contracts/streampay-stream/src/storage.rs` and `.../limits.rs`.

## Storage tiers

Soroban exposes three storage durabilities. The contract uses two of them:

| Tier           | Used for                                              | Lifetime                                            |
| -------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **Instance**   | Singletons that share the contract instance's TTL.    | Extended as a group whenever the instance is bumped. |
| **Persistent** | Per-stream and per-sender rows that outlive the instance. | Extended individually on every read/write.          |

Temporary storage is intentionally not used: no contract state may silently
disappear between ledgers.

## Keys

### Instance storage (`DataKey`)

| Key             | Value     | Purpose                                            |
| --------------- | --------- | -------------------------------------------------- |
| `Admin`         | `Address` | Governance address authorised for admin entrypoints. |
| `Paused`        | `bool`    | Global pause guard checked by state-changing calls. |
| `StreamCount`   | `u64`     | Monotonic counter; source of the next stream id.   |

### Persistent storage (`DataKey`)

| Key                  | Value    | Purpose                                                  |
| -------------------- | -------- | -------------------------------------------------------- |
| `Stream(u64)`        | `Stream` | A single stream row, keyed by its stream id.             |
| `TokenAllowed(Address)` | `bool` | Per-token allow/deny entry. Absent ⇒ token is allowed.   |

### Persistent storage (`LimitDataKey`)

| Key                          | Value | Purpose                                              |
| ---------------------------- | ----- | ---------------------------------------------------- |
| `MaxStreamsPerSender`        | `u64` | Configurable cap on active streams per sender.       |
| `SenderStreamCount(Address)` | `u64` | Live count of active streams for one sender address. |

> `MaxStreamsPerSender` is stored in **instance** storage (it is a global
> singleton), while `SenderStreamCount` is **persistent** (one row per sender).

## TTL tiers

TTLs are expressed in ledger sequences (~5s per ledger on mainnet). Each tier
defines a *minimum remaining* threshold and an *extend-to* target: when an entry
is touched and its remaining TTL falls below the threshold, it is bumped back up
to the target.

| Tier                | Min remaining | Extend to | Approx. window         |
| ------------------- | ------------- | --------- | ---------------------- |
| Instance keys       | `43_200`      | `120_960` | ~2.5 days → ~1 week    |
| Per-stream rows     | `120_960`     | `483_840` | ~1 week → ~4 weeks     |
| Per-sender counters | `120_960`     | `483_840` | ~1 week → ~4 weeks     |

These values are tuned for long-running payment streams plus a recovery buffer
so an active stream cannot expire mid-flight. Keep them aligned with the
operational runbook.

## Invariants

- **Stream ids start at `1`** and increase monotonically; ids are never reused.
- **Reading or writing a stream extends its TTL**, so active streams stay alive.
- **Token allowlist is allow-by-default**: a token is blocked only when an
  explicit `TokenAllowed(addr) = false` entry exists.
- **Sender counters are reference-counted**: incremented on stream creation and
  decremented when a stream leaves the active set, never dropping below zero.
