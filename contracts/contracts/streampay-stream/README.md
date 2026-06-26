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

## Contract Metadata

The compiled WASM binary embeds three `contractmetav0` entries readable by
Stellar tooling (Horizon, Stellar Expert, Soroban CLI):

| Key | Value |
|-----|-------|
| `name` | `streampay-stream` |
| `version` | `0.1.0` (semver — bump MINOR for new features, MAJOR for breaking changes) |
| `repo` | `https://github.com/stream-pay/StreamPay-Frontend` |

To inspect the metadata on a deployed contract or a local WASM file:

```bash
# From a local WASM binary (after cargo build --release):
stellar contract info --wasm target/wasm32v1-none/release/streampay_stream.wasm

# From a deployed contract (Testnet example):
stellar contract info --id <CONTRACT_ID> --network testnet
```

The metadata values live in `src/lib.rs` as the public constants `CONTRACT_NAME`,
`CONTRACT_VERSION`, and `CONTRACT_REPO`.  Both the `contractmeta!` macro
invocations and the unit tests reference these constants, so there is no way
for the binary metadata and the tested expectations to drift apart.
