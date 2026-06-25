# StreamPay Stream Smart Contract

Linear payment streams on Stellar/Soroban.

## Entrypoints

| Entrypoint | Mutating | Required Authorizer | Description |
| :--- | :--- | :--- | :--- |
| `initialize` | Yes | `admin` | Initialises the contract with an admin and pause state. |
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
