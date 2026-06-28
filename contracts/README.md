# StreamPay Soroban Contracts

This workspace contains the StreamPay Soroban contracts.

## streampay-stream

`streampay-stream` manages funded token streams with a draft-to-active
lifecycle:

- `create_stream(..., draft: true)` creates a funded Draft stream.
- `start_stream(stream_id)` can only be called by the stream sender and changes
  a Draft stream to Active.
- Draft streams accrue nothing. Activation anchors `start_time` and
  `last_update` to the current ledger timestamp and derives `end_time` from the
  configured duration.
- Escrow funding happens at `create_stream` for both Draft and Active streams,
  so a stream is fully funded before it can accrue or be withdrawn.

The contract exposes stable `#[contracterror]` codes from
`contracts/streampay-stream/src/error.rs` for backend error mapping.

## Deploy

Deploy the contract to Stellar testnet with:

```sh
STELLAR_SEED_SECRET_KEY=S... bash ../operations/deploy-testnet.sh
```

The script:

- Builds the WASM via `stellar contract build`
- Deploys via `stellar contract deploy` using the built-in testnet config
- Saves the contract ID to `contracts/.contracts/streampay-stream.id`
- Is idempotent — re-running skips deployment unless `FORCE_DEPLOY=true`

### Prerequisites

- `stellar` CLI — `cargo install stellar-cli`
- Rust `wasm32v1-none` target — `rustup target add wasm32v1-none`
- A funded testnet account with its secret key in `STELLAR_SEED_SECRET_KEY`

### Environment variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `STELLAR_SEED_SECRET_KEY` | — | yes | Deployer secret key |
| `STELLAR_NETWORK` | `testnet` | no | Network name (`testnet`, `futurenet`, or a JSON config) |
| `STELLAR_HORIZON_URL` | — | no | Custom Horizon RPC URL |
| `CONTRACT_NAME` | `streampay-stream` | no | Contract package name |
| `FORCE_DEPLOY` | `false` | no | Re-deploy over an existing deployment |

### Idempotency

Deployed contract IDs are stored in `contracts/.contracts/<name>.id`. This file is
gitignored (do not commit it). On re-run, the script reads the existing ID and
exits early. To force a fresh deployment:

```sh
FORCE_DEPLOY=true STELLAR_SEED_SECRET_KEY=S... bash ../operations/deploy-testnet.sh
```

## Tests

Run the contract tests from this directory:

```sh
cargo test -p streampay-stream
```
