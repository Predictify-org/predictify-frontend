# StreamPay Soroban Workspace

This workspace contains the Soroban contract crate(s) that back StreamPay's on-chain integration.

## Current Status

The repository currently contains one scaffolded contract crate at [contracts/contracts/streampay-stream](./contracts/streampay-stream). The crate still exposes the Soroban starter `hello` entrypoint, while the frontend already models a richer stream lifecycle in [lib/onChainClient.ts](../lib/onChainClient.ts) and [types.ts](../types.ts).

That means this workspace README serves two purposes:

- document what is implemented today so builds and reviews stay accurate
- document the integration target the frontend expects when the real stream ABI lands

## Workspace Layout

```text
contracts/
├── Cargo.toml
├── Cargo.lock
├── README.md
└── contracts/
    └── streampay-stream/
        ├── Cargo.toml
        ├── Makefile
        ├── README.md
        └── src/
            ├── lib.rs
            └── test.rs
```

## Contract Index

| Crate | Purpose | README |
| --- | --- | --- |
| `streampay-stream` | Soroban contract for the StreamPay stream lifecycle | [contracts/contracts/streampay-stream/README.md](./contracts/streampay-stream/README.md) |

## Verified Local Commands

These commands were checked in this branch:

| Command | Result | Notes |
| --- | --- | --- |
| `cargo test` | Passed | Verified locally on 2026-05-26 from `contracts/` |
| `make test` | Passed | Verified locally on 2026-05-26 from `contracts/contracts/streampay-stream/` |
| `cargo build --target wasm32v1-none --release -p streampay-stream` | Blocked | Failed locally because the `wasm32v1-none` target is not installed in this environment |
| `stellar contract build` | Blocked | The `stellar` CLI is not installed locally; `cargo install stellar-cli --locked` also failed due `crates.io` DNS resolution during this session |

## Quick Start

From the workspace root:

```bash
cd contracts

# Run Rust tests for all contract crates
cargo test

# Build the stream contract with the Stellar CLI once installed
cd contracts/streampay-stream
stellar contract build
```

If `stellar` is unavailable, install the Stellar CLI first and ensure the wasm target is installed in your Rust toolchain.

## Deployment Index

The full deployment and integration guide lives in [contracts/contracts/streampay-stream/README.md](./contracts/streampay-stream/README.md).

At a high level:

1. Build the wasm artifact.
2. Fund or configure the deployer account.
3. Deploy to testnet or mainnet with the correct network passphrase.
4. Record the resulting contract ID in the config table below.
5. Replace the mock adapter in [lib/onChainClient.ts](../lib/onChainClient.ts) with Soroban RPC reads/invocations.

## Network Config

Fill these values in after deployment:

| Network | RPC URL | Network Passphrase | Contract ID |
| --- | --- | --- | --- |
| Testnet | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` | `TBD` |
| Mainnet | `https://mainnet.sorobanrpc.com` | `Public Global Stellar Network ; September 2015` | `TBD` |

If the frontend adds env-based routing later, prefer explicit variables such as:

```bash
NEXT_PUBLIC_STREAMPAY_STREAM_CONTRACT_ID_TESTNET=
NEXT_PUBLIC_STREAMPAY_STREAM_CONTRACT_ID_MAINNET=
NEXT_PUBLIC_STELLAR_RPC_URL=
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=
```

## Frontend Integration Links

- Adapter to replace: [lib/onChainClient.ts](../lib/onChainClient.ts)
- Frontend stream shape: [types.ts](../types.ts)
- Current UI mapping notes: [mapping.ts](../mapping.ts)

The contract README documents the expected mapping from Soroban responses into `OnChainStream` and `ContractStreamStatus`.
