# `streampay-stream`

Soroban contract workspace documentation for the StreamPay stream contract crate.

## Status

This crate is currently a scaffold. The implemented public ABI is the Soroban starter `hello` method in [src/lib.rs](./src/lib.rs), while the frontend already expects a richer stream contract model via [lib/onChainClient.ts](../../../lib/onChainClient.ts) and [types.ts](../../../types.ts).

Use this README as both:

- the source of truth for what the crate exposes today
- the handoff guide for the target stream ABI that will replace the frontend mock

## Contract Architecture

### Current implementation

The crate currently contains:

- one contract type: `Contract`
- one public entrypoint: `hello(env: Env, to: String) -> Vec<String>`
- one unit test in [src/test.rs](./src/test.rs)
- no persisted stream storage
- no events
- no custom error enum
- no escrow or lifecycle enforcement yet

### Target StreamPay model

The frontend types and reconciliation code indicate the intended contract shape:

- a `Stream` record keyed by stream ID
- escrow-backed balances where released value is derived from time and settlement activity
- lifecycle statuses aligned with `ContractStreamStatus` in [types.ts](../../../types.ts):
  - `DRAFT`
  - `ACTIVE`
  - `PAUSED`
  - `SETTLED`
  - `ENDED`
  - `CANCELLED`

Until the Rust contract implements those semantics, treat the sections below labeled "target" as integration guidance, not as deployed behavior.

## Lifecycle State Machine

### Current state machine

There is no stream lifecycle state machine in the current crate. The only callable path is `hello`.

### Target state machine

The frontend model suggests this intended progression:

```text
DRAFT -> ACTIVE -> PAUSED -> ACTIVE
ACTIVE -> SETTLED
ACTIVE -> ENDED
PAUSED -> ENDED
ACTIVE|PAUSED -> CANCELLED
```

Recommended invariants for the eventual contract:

- released amount must never exceed total amount
- escrow balance must never become negative
- settlement and withdrawal paths must be idempotent when retried
- terminal states should reject additional release activity

## Escrow Model

### Current implementation

No escrow model is implemented in the current scaffold.

### Target model

The frontend contract adapter expects the contract to surface values equivalent to:

| Field | Meaning |
| --- | --- |
| `total_amount` | Total escrowed amount for the stream |
| `released_amount` | Amount already released or settled to the recipient |
| `velocity` | Streaming rate used to derive releasable value |
| `last_update_timestamp` | Last ledger timestamp used to compute stream state |
| `recipient_address` | Stellar recipient account |
| `status` | Lifecycle status enum |

Those fields align with the TypeScript `OnChainStream` interface in [types.ts](../../../types.ts).

## Public ABI

### Implemented ABI

The only public entrypoint implemented today is:

| Entrypoint | Params | Returns | Notes |
| --- | --- | --- | --- |
| `hello` | `env: Env`, `to: String` | `Vec<String>` | Returns `["Hello", to]` |

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `env` | `Env` | Soroban execution environment |
| `to` | `String` | Greeting recipient |

#### Events

No contract events are emitted by the current implementation.

#### Errors

No contract-specific error enum is defined by the current implementation.

### Target ABI for frontend replacement

The frontend mock in [lib/onChainClient.ts](../../../lib/onChainClient.ts) and the mapper in [mapping.ts](../../../mapping.ts) imply the contract read surface should eventually provide a stream object shaped like:

```ts
interface OnChainStream {
  id: string;
  recipient_address: string;
  total_amount: bigint;
  released_amount: bigint;
  velocity: bigint;
  last_update_timestamp: number;
  status: ContractStreamStatus;
}
```

Recommended target entrypoints for the real contract, once implemented:

| Entrypoint | Purpose |
| --- | --- |
| `create_stream` | Initialize stream storage and escrow funding |
| `get_stream` | Read a stream by ID for frontend consumption |
| `pause_stream` | Pause accrual or settlement |
| `resume_stream` | Resume an active stream |
| `settle_stream` | Realize releasable value into released balance |
| `cancel_stream` | Stop a stream and return remaining escrow |
| `withdraw_released` | Withdraw already released value |

These target methods are not implemented in the current crate and are documented here so the frontend integration path is explicit.

## Build And Test

From the workspace root:

```bash
cd contracts
cargo test
```

From the crate directory:

```bash
cd contracts/contracts/streampay-stream
make test
```

### Verified in this branch

```text
$ cd contracts && cargo test
running 1 test
test test::test ... ok

test result: ok. 1 passed; 0 failed
```

### Build commands

Preferred Soroban CLI path:

```bash
cd contracts/contracts/streampay-stream
stellar contract build
```

Rust fallback path:

```bash
cd contracts
cargo build --target wasm32v1-none --release -p streampay-stream
```

Verification note:

- `cargo test` passed locally on 2026-05-26
- `cargo build --target wasm32v1-none --release -p streampay-stream` was attempted locally and failed because the `wasm32v1-none` target is not installed in this environment
- `stellar contract build` could not be executed locally because the `stellar` CLI is not installed, and `cargo install stellar-cli --locked` failed during this session due `crates.io` DNS resolution errors

## Makefile Targets

The crate Makefile currently exposes:

| Target | Command |
| --- | --- |
| `make build` | `stellar contract build` |
| `make test` | `cargo test` |
| `make fmt` | `cargo fmt --all` |
| `make clean` | `cargo clean` |

## Deployment

### Prerequisites

- Stellar CLI installed
- deployer key configured in your Stellar CLI profile
- testnet or mainnet account funded
- wasm artifact built successfully

### Testnet deploy

```bash
cd contracts/contracts/streampay-stream

stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/streampay_stream.wasm \
  --source <DEPLOYER_KEY_ALIAS_OR_SECRET> \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

Record the returned contract ID in the addresses section below.

### Mainnet deploy

```bash
cd contracts/contracts/streampay-stream

stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/streampay_stream.wasm \
  --source <DEPLOYER_KEY_ALIAS_OR_SECRET> \
  --rpc-url https://mainnet.sorobanrpc.com \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

### Post-deploy checks

- save the emitted contract ID
- verify the contract can be queried from the intended RPC
- update frontend config with the correct network-to-contract mapping
- replace the mock adapter in [lib/onChainClient.ts](../../../lib/onChainClient.ts)

## Frontend Integration Guide

### Current mock adapter

[lib/onChainClient.ts](../../../lib/onChainClient.ts) currently returns hard-coded `OnChainStream` objects:

- `id`
- `recipient_address`
- `total_amount`
- `released_amount`
- `velocity`
- `last_update_timestamp`
- `status`

### Replacement plan

1. Add the deployed contract ID and RPC URL to frontend config.
2. Create a Soroban RPC client in `lib/onChainClient.ts`.
3. Invoke a read entrypoint such as `get_stream`.
4. Decode Soroban values into the `OnChainStream` shape.
5. Map the returned status into `ContractStreamStatus`.
6. Preserve bigint handling for amount fields.

### Mapping to `OnChainStream`

| Contract value | TypeScript field | Type |
| --- | --- | --- |
| stream ID | `id` | `string` |
| recipient account | `recipient_address` | `string` |
| total escrow | `total_amount` | `bigint` |
| released amount | `released_amount` | `bigint` |
| rate | `velocity` | `bigint` |
| update timestamp | `last_update_timestamp` | `number` |
| lifecycle enum | `status` | `ContractStreamStatus` |

### Mapping to `ContractStreamStatus`

The frontend enum currently expects:

| Contract enum | Frontend enum |
| --- | --- |
| `DRAFT` | `ContractStreamStatus.DRAFT` |
| `ACTIVE` | `ContractStreamStatus.ACTIVE` |
| `PAUSED` | `ContractStreamStatus.PAUSED` |
| `SETTLED` | `ContractStreamStatus.SETTLED` |
| `ENDED` | `ContractStreamStatus.ENDED` |
| `CANCELLED` | `ContractStreamStatus.CANCELLED` |

If the Rust contract uses numeric discriminants instead of strings, keep the mapping centralized in `lib/onChainClient.ts` so the rest of the app stays unchanged.

## Addresses And Config

Populate these after deployment:

| Network | Contract ID | Notes |
| --- | --- | --- |
| Local | `TBD` | Optional local sandbox deployment |
| Testnet | `TBD` | Update after first successful deploy |
| Mainnet | `TBD` | Update only after production rollout approval |

Suggested frontend env keys:

```bash
NEXT_PUBLIC_STREAMPAY_STREAM_CONTRACT_ID_TESTNET=
NEXT_PUBLIC_STREAMPAY_STREAM_CONTRACT_ID_MAINNET=
NEXT_PUBLIC_STELLAR_RPC_URL=
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=
```

## Security Notes

- Do not hard-code deployer secrets in source control.
- Treat contract IDs as environment-specific configuration, not constants scattered through the app.
- Keep status decoding strict; reject unknown enum values instead of silently coercing them.
- Preserve bigint precision for amounts. Do not convert on-chain values through JavaScript `number`.
- For irreversible flows such as settlement, cancellation, or withdrawal, keep retry logic idempotent and log contract invocation failures with correlation IDs.
