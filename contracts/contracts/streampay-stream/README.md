# StreamPay Stream Smart Contract

Linear payment streams on Stellar/Soroban.

## Entrypoints

| Entrypoint | Mutating | Required Authorizer | Description |
| :--- | :--- | :--- | :--- |
| `initialize` | Yes | `admin` | Initialises the contract with an admin and pause state. |
| `init_with_token_allowlist` | Yes | `admin` | Atomic deployment-time initialisation + per-token allowlist; equivalent to `initialize` followed by one `set_token_allowed(allowed = true)` per token, committed in a single transaction. |
| `set_paused` | Yes | `admin` | Sets the global emergency pause flag. |
| `set_admin` | Yes | `admin` | Transfers the admin role to a new address. |
| `set_token_allowed` | Yes | `admin` | Allows or blocks a token for future stream creation. |
| `create_stream` | Yes | `sender` | Creates a stream and escrows funds from the sender. |
| `start_stream` | Yes | `stream.sender` | Activates a draft stream, anchoring its time bounds. |
| `pause` | Yes | `stream.sender` | Freezes accrual for an active stream. |
| `resume` | Yes | `stream.sender` | Resumes a paused stream, extending the end time. |
| `cancel_stream` | Yes | `stream.sender` | Ends a stream early, refunding unvested funds to sender. |
| `withdraw` | Yes | `stream.recipient` | Withdraws vested funds to the recipient. |
| `settle` | Yes | `stream.recipient` | Ends a stream and releases all remaining funds to recipient. |
| `get_stream` | No | None | Returns the stream record. |
| `withdrawable` | No | None | Returns the currently withdrawable amount. |
| `stream_balance` | No | None | Returns the vested balance at the current time. |

## Development

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test
```

## Storage layout

All on-chain state is owned by `src/storage.rs`.  No other module calls
`env.storage()` directly; every read and write goes through the typed helpers
defined there.

### Storage tiers

Soroban offers three storage tiers.  StreamPay uses two:

**Instance storage** — entries share the contract instance's TTL.  Used for
singletons that must be available for the entire contract lifetime:

| Key | Rust type | Description |
|-----|-----------|-------------|
| `Admin` | `Address` | Privileged governance address set at `initialize`. |
| `Paused` | `bool` | Global emergency-pause flag.  Absent = `false` (not paused). |
| `StreamCount` | `u64` | Monotonically increasing counter; provides the next stream id. |
| `TokenAllowed(Address)` | `bool` | Per-token allowlist entry.  Absent = allowed (default-allow policy). |

**Persistent storage** — each entry has its own independent TTL.  Used for
stream rows, which may need to live for months:

| Key | Rust type | Description |
|-----|-----------|-------------|
| `Stream(u64)` | `Stream` | Full stream record keyed by numeric stream id. |

### Key naming conventions

All keys are variants of the `DataKey` enum (`#[contracttype]`), which
Soroban serialises as tagged XDR values:

- **Singleton keys** — bare unit variants: `Admin`, `Paused`, `StreamCount`.
- **Entity keys** — tuple variants carrying the primary identifier:
  `Stream(u64)`, `TokenAllowed(Address)`.

Using a typed enum rather than raw `symbol_short!` strings means the compiler
rejects unknown keys and the encoding is deterministic.

### TTL constants

TTLs are expressed in ledger sequences (≈ 5 s each on mainnet):

| Constant | Ledgers | Wall time |
|----------|---------|-----------|
| `STREAM_TTL_MIN_REMAINING` | 120 960 | ~1 week |
| `STREAM_TTL_EXTEND_TO` | 483 840 | ~4 weeks |
| `INSTANCE_TTL_MIN_REMAINING` | 43 200 | ~2.5 days |
| `INSTANCE_TTL_EXTEND_TO` | 120 960 | ~1 week |

Stream entries use a much larger window because a stream may run for weeks and
must remain readable and writable throughout.  Instance entries use a shorter
window because they are touched on every admin operation.

### Rustdoc

For the full inline documentation, including per-variant and per-field
explanations, run:

```bash
cargo doc -p streampay-stream --no-deps --open
```

The rendered module page is `streampay_stream/storage/index.html`.
