# Contract CLI Smoke Tests

Smoke tests for the StreamPay Soroban contract use `stellar contract invoke`
to call every public entrypoint against a live (testnet) contract instance.

## What they cover

Every entrypoint listed in the [contract README](../contracts/contracts/streampay-stream/README.md)
is exercised with at minimum one happy-path or expected-error invocation:

| Entrypoint | Test type | Expected outcome |
|---|---|---|
| `initialize` | Error-path | `InvalidState` — already initialised |
| `init_with_token_allowlist` | Error-path | `InvalidState` — already initialised |
| `set_paused` | Happy-path | pause → unpause round-trip |
| `set_paused` (guarded) | Error-path | `ContractPaused` on `create_stream` when paused |
| `set_admin` | Happy-path | role-transfer succeeds |
| `set_admin` (revoked) | Error-path | `Unauthorized` when old admin retries |
| `set_token_allowed` | Happy-path | block + re-allow dummy token |
| `set_token_allowed` (guarded) | Error-path | `TokenNotAllowed` on `create_stream` |
| `set_max_streams_per_sender` | Happy-path | set → read-back → reset |
| `max_streams_per_sender` | Happy-path | returns `u64` |
| `sender_stream_count` | Happy-path | returns `u64` |
| `create_stream` | Happy-path | returns stream ID (funded account required) |
| `create_stream` | Error-path | `InvalidAmount` (amount=0) |
| `create_stream` | Error-path | `InvalidTimeRange` (end ≤ start) |
| `create_stream` | Error-path | `ContractPaused` when paused |
| `create_stream` | Error-path | `TokenNotAllowed` for blocked token |
| `get_stream` | Happy-path | returns stream data |
| `get_stream` | Error-path | `NotFound` (stream 9999) |
| `withdrawable` | Happy-path | returns `i128` |
| `withdrawable` | Error-path | `NotFound` (stream 9999) |
| `stream_balance` | Happy-path | returns `i128` |
| `stream_balance` | Error-path | `NotFound` (stream 9999) |
| `start_stream` | Error-path | `NotFound` (stream 9999) |
| `pause` | Happy-path | active → paused |
| `pause` | Error-path | `NotFound` (stream 9999) |
| `resume` | Happy-path | paused → active |
| `resume` | Error-path | `NotFound` (stream 9999) |
| `amend_stream` | Happy-path | extend end_time |
| `amend_stream` | Error-path | `NotFound` (stream 9999) |
| `cancel_stream` | Happy-path | returns unvested funds |
| `cancel_stream` | Error-path | `NotFound` (stream 9999) |
| `cancel_stream` | Error-path | `InvalidState` on already-cancelled stream |
| `withdraw` | Error-path | `InvalidAmount` (amount=0) |
| `withdraw` | Error-path | `NotFound` (stream 9999) |
| `settle` | Error-path | `NotFound` (stream 9999) |
| `settle` | Error-path | `InvalidState` on cancelled stream |

## Files

| File | Purpose |
|---|---|
| `scripts/smoke-contract.test.ts` | Jest suite — machine-readable, integrates with coverage |
| `scripts/smoke-contract.sh` | Shell harness — standalone runner for local use |
| `.github/workflows/smoke.yml` | Dedicated CI job: build → fund → deploy → initialise → smoke |

## Running locally

### Prerequisites

- `stellar` CLI: `cargo install stellar-cli`
- Rust `wasm32v1-none` target: `rustup target add wasm32v1-none`
- A funded testnet account (use [Friendbot](https://friendbot.stellar.org) to fund)
- A deployed contract — run `scripts/deploy-grantfox-contract.sh` first, or
  set `CONTRACT_ID` to an existing one

### Quick start

```bash
# Deploy a fresh contract (only needed once per testnet session)
STELLAR_SEED_SECRET_KEY=S... bash scripts/deploy-grantfox-contract.sh

# Run Jest smoke suite
CONTRACT_ID=C... STELLAR_SEED_SECRET_KEY=S... npm run smoke

# Run shell harness directly
CONTRACT_ID=C... STELLAR_SEED_SECRET_KEY=S... npm run smoke:shell
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CONTRACT_ID` | Yes (or from file) | reads `contracts/.contracts/streampay-stream.id` | Deployed contract C-address |
| `STELLAR_SEED_SECRET_KEY` | Yes (for mutating tests) | — | Ed25519 secret key for admin/sender |
| `STELLAR_SEED_PUBLIC_KEY` | No | derived from secret | Public key (fallback if derivation fails) |
| `RECIPIENT_SECRET_KEY` | No | same as sender | Separate recipient key for withdraw smoke |
| `RECIPIENT_PUBLIC_KEY` | No | same as sender | Recipient public key |
| `STELLAR_NETWORK` | No | `testnet` | `testnet` \| `futurenet` \| `standalone` |
| `STELLAR_RPC_URL` | No | Stellar's default | Override Soroban RPC endpoint |
| `SMOKE_TOKEN_ADDRESS` | No | native XLM SAC on testnet | Token contract address for stream creation |
| `SMOKE_STREAM_DURATION` | No | `120` | Stream duration in seconds |
| `SMOKE_SKIP_BUILD` | No | `false` | Skip WASM rebuild step |

### Running in offline / structural mode

Both harnesses degrade gracefully when `CONTRACT_ID` or
`STELLAR_SEED_SECRET_KEY` are unset:

- The Jest suite skips all network-dependent tests and passes on exit 0.
- The shell harness exits at the pre-flight check with a clear error.

This is how `ci.yml` runs the smoke step — no chain access needed, just
validating the harness itself loads and that the test pattern resolves.

## CI integration

### `ci.yml` (main CI)

Runs the Jest smoke suite in **offline mode** on every push/PR. No
`CONTRACT_ID` or `STELLAR_SEED_SECRET_KEY` is set, so network-dependent
tests skip gracefully. This verifies the harness itself doesn't have
syntax errors or broken imports.

### `smoke.yml` (dedicated smoke job)

Triggered on pushes/PRs that touch `contracts/**` or
`scripts/smoke-contract.*`. Performs the full on-chain flow:

1. Builds the contract WASM from source
2. Generates a throwaway testnet keypair
3. Funds it via Friendbot
4. Deploys a fresh contract instance
5. Initialises the contract (`initialize`)
6. Runs the Jest suite with full chain access
7. Runs the shell harness as a second opinion

The job is isolated from `ci.yml` so documentation-only PRs don't pay the
20-minute budget. It can also be triggered manually via `workflow_dispatch`
with an optional `contract_id` override (useful for testing against an existing
deployment without re-deploying).

## Security properties

- **Testnet-only guard**: Both the Jest suite and the shell harness check
  `NODE_ENV` and refuse to run in `production`. CI validates `STELLAR_NETWORK`
  is `testnet` and fails the build if not.
- **Ephemeral keys**: The smoke CI job generates a fresh throwaway keypair per
  run; the secret is masked in logs via `::add-mask::`.
- **No mainnet paths**: `STELLAR_NETWORK=mainnet` is never set in any CI
  workflow; the `validate environment` step in `ci.yml` enforces this.
- **Read-only fallback**: Tests that don't require auth (`get_stream`,
  `withdrawable`, `stream_balance`, `settle 9999`, `max_streams_per_sender`)
  run without a secret key and cannot submit transactions.
