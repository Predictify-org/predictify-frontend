# streampay-contracts

Soroban smart contracts for **StreamPay** — continuous payment streaming on the Stellar network.

## Overview

This repo contains the on-chain logic for creating, starting, stopping, and settling payment streams. Contracts are written in Rust using the [Soroban SDK](https://soroban.stellar.org/docs).

### Contract interface

- **`create_stream(payer, recipient, rate_per_second, initial_balance, recipient_can_stop)`** — Create a new stream (payer must auth). Set `recipient_can_stop = true` to allow the recipient to also stop the stream; defaults to `false` (payer-only).
- **`start_stream(stream_id)`** — Start an existing stream.
- **`stop_stream(stream_id, stopper)`** — Stop an active stream. `stopper` must be the payer (always allowed) or the recipient (only when `recipient_can_stop` was set at creation). `stopper` must authorise the call.
- **`settle_stream(stream_id)`** — Compute and deduct streamed amount since last settlement; returns amount.
- **`batch_settle(stream_ids)`** — Settle multiple streams in a single call; returns one settled amount per input id.
- **`archive_stream(stream_id)`** — Remove a fully-settled, inactive stream from storage (payer must auth).
- **`get_stream_info(stream_id)`** — Read stream metadata (payer, recipient, rate, balance, timestamps, active, recipient_can_stop).
- **`version()`** — Returns the contract version as a `u32` (no auth required).

### Batch settlement semantics

- `batch_settle` is all-or-nothing. If any stream id is missing or any item panics, the entire invocation reverts and no settlement updates are committed.
- Inactive streams settle to `0`, matching `settle_stream`.
- The contract caps each batch at `25` stream ids to keep Soroban resource usage predictable. Off-chain indexers and payroll processors should chunk larger workloads into multiple transactions.

## Storage Model

Streams are stored in **Soroban persistent storage** with per-stream TTL
management. Each stream is an independent ledger entry that can expire
independently. The contract instance storage holds only the `next_id` counter.
The counter is 1-based; once it rolls over, the contract stores `0` as an
exhausted sentinel and rejects further stream creation with `stream id overflow`.

See `docs/factory-pattern.md` for the full design rationale and future factory
pattern graduation path.

### Version encoding

The on-chain version uses a packed `u32` scheme: `major * 1_000_000 + minor * 1_000 + patch`.

| Semver | u32       |
|--------|-----------|
| 0.1.0  | 1 000     |
| 1.0.0  | 1 000 000 |
| 1.2.3  | 1 002 003 |

When releasing, update **both** `Cargo.toml` `version` and the `VERSION` const in `src/lib.rs`.

## Prerequisites

- [Rust](https://rustup.rs/) (stable, with `rustfmt`)
- Optional: [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli) for deployment

Note: this crate uses `soroban-sdk` version 22.0 (see `Cargo.toml`).

## Building, testing and deploying

1) Build optimized WASM (recommended via Docker builder included):

```bash
# Build with local toolchain (WASM output in target/)
cargo build --release --target wasm32-unknown-unknown

# OR use deterministic Docker builder (produces streampay_contracts.wasm)
docker build -f docker/Dockerfile.build -t streampay-wasm .
docker run --rm -v "$(pwd)":/work streampay-wasm
```

2) Run unit tests locally:

```bash
cargo test
```

3) Deploy to Futurenet/Testnet using `soroban` CLI (example):

```bash
# install soroban CLI if not installed
curl -sSf https://soroban.stellar.org/install.sh | bash

# set the network (futurenet/testnet)
soroban config set network futurenet

# upload contract and get contract id (example paths)
soroban contract publish --wasm target/wasm32-unknown-unknown/release/streampay_contracts.wasm

# note the contract id printed by the publish command
```

4) Example invocation (replace `<CONTRACT_ID>` and addresses):

```bash
# create_stream(payer, recipient, rate_per_second, initial_balance)
soroban contract invoke --wasm target/wasm32-unknown-unknown/release/streampay_contracts.wasm \
   --id <CONTRACT_ID> --fn create_stream --args <PAYER_ADDRESS> <RECIPIENT_ADDRESS> 100 10000

# start_stream(stream_id)
soroban contract invoke --id <CONTRACT_ID> --fn start_stream --args 1
```

### Notes
- The exact `soroban` CLI flags depend on the CLI version; consult `soroban --help`.
- For deterministic WASM builds in CI, use the provided `docker/Dockerfile.build` which pins the Rust toolchain.
- Ensure the `soroban-sdk` version in `Cargo.toml` is compatible with your `soroban` CLI and network.

## Setup for contributors

1. **Clone and enter the repo**
   ```bash
   git clone <repo-url>
   cd streampay-contracts
   ```

2. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup component add rustfmt
   ```

3. **Verify setup**
   ```bash
   cargo fmt --all -- --check
   cargo build
   cargo test
   ```

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `cargo build`  | Build the contract         |
| `cargo test`   | Run unit tests             |
| `cargo fmt`    | Format code                |
| `cargo fmt --all -- --check` | Check formatting (CI) |
| `./scripts/check-wasm-size.sh` | Check optimized WASM size |
| `bash contracts/tests/smoke.sh` | Integration smoke test (build → deploy → invoke all entry points) |

## Smoke tests

An integration smoke test builds the WASM, starts a local Stellar sandbox,
deploys the contract, and invokes every public entry point:

```bash
bash contracts/tests/smoke.sh
```

See [`contracts/tests/smoke.sh`](contracts/tests/smoke.sh) for details.
Requires: Rust (with `wasm32-unknown-unknown` target), Stellar CLI.

## CI/CD

On every push/PR to `main`, GitHub Actions runs:

- Format check: `cargo fmt --all -- --check`
- Build: `cargo build`
- Tests: `cargo test`
- WASM size check: Reports optimized contract size and warns if approaching limits
- Contract smoke test: Builds WASM, deploys to local sandbox, invokes all entry points

Ensure all checks pass before merging. See [docs/resource-limits.md](docs/resource-limits.md) for details on Soroban resource constraints.

## Releases

Tagged releases follow [semver](https://semver.org/). Each release includes an optimized WASM artifact and SHA-256 checksum.

See [docs/RELEASE.md](docs/RELEASE.md) for the full release process, including how to verify WASM builds.

## Project structure

```
streampay-contracts/
├── src/
│   ├── lib.rs                        # Contract entry points and tests
│   └── stream.rs                     # StreamInfo and storage helpers
├── docker/
│   └── Dockerfile.build              # Deterministic WASM builder
├── .github/workflows/
│   ├── ci.yml                        # Format, build, test
│   ├── smoke.yml                     # Integration smoke test
│   └── release.yml                   # Tagged release workflow
├── tests/
│   └── smoke.sh                      # WASM build + sandbox invoke smoke test
├── docs/
│   ├── RELEASE.md                    # Release process guide
│   ├── architecture-overview.md      # Crate layout map
│   ├── error-codes.md                # Panic string reference
│   ├── glossary.md                   # Streaming terminology
│   ├── local-development.md          # Contributor environment setup
│   └── ...                           # Plus design specs per feature
├── scripts/
│   ├── build.sh                      # Release WASM build
│   ├── test.sh                       # Test suite with testutils feature
│   ├── fmt-check.sh                  # rustfmt CI mirror
│   ├── deny.sh                       # cargo-deny wrapper
│   ├── clean.sh                      # Drop target/ and artifacts/
│   ├── wasm-hash.sh                  # SHA-256 of release wasm
│   └── check-wasm-size.sh            # WASM size guard
├── cliff.toml                        # Changelog generator config
├── rust-toolchain.toml               # Pinned Rust version
├── Cargo.toml
├── CHANGELOG.md
└── README.md
```

## License

MIT

## Documentation

| Doc | Description |
|---|---|
| [`docs/timestamp-accrual.md`](docs/timestamp-accrual.md) | Ledger timestamp assumptions: validator behavior, coarse granularity, accrual edge cases, off-chain UX rounding |
| [`docs/error-codes.md`](docs/error-codes.md) | Canonical list of panic strings the contract can emit |
| [`docs/glossary.md`](docs/glossary.md) | Definitions for terms used across the codebase and docs |
| [`docs/local-development.md`](docs/local-development.md) | Contributor environment setup |
| [`docs/scripts.md`](docs/scripts.md) | Reference for the helper scripts under `scripts/` |
| [`docs/ttl-strategy.md`](docs/ttl-strategy.md) | Persistent storage TTL refresh strategy |
| [`SECURITY.md`](SECURITY.md) | Security policy and responsible disclosure |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution guidelines |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
