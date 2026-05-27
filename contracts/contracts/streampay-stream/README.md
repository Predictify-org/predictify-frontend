# `streampay-stream`

Soroban contract crate for escrow-backed token streams.

## Entrypoints

The contract currently exports:

- `initialize`
- `set_paused`
- `set_token_allowed`
- `create_stream`
- `start_stream`
- `get_stream`
- `withdrawable`
- `withdraw`

## Storage Layout

The contract keeps hot-path bookkeeping small and predictable:

- `instance()`:
  - `Admin`
  - `Paused`
  - `NextStreamId`
- `persistent()`:
  - `Stream(u64)`
  - `TokenAllowed(Address)`

### Hot-path storage behavior

- `create_stream` writes the stream record once and advances the stream counter once.
- `start_stream` reads the stream record once and writes it back once.
- `withdraw` reads the stream record once, computes accrual from the in-memory value, and writes it back once.
- `withdrawable_amount` now works from the already-loaded `Stream`, so `withdraw` no longer re-reads stream state while calculating available funds.

## Budget Profiling

Budget tests use Soroban metering via `env.cost_estimate()` and `env.cost_estimate().budget()`.

Command used:

```bash
cd contracts
cargo test -p streampay-stream budget -- --nocapture
```

Measured top-level invocation resources:

| Entrypoint | CPU Before | CPU After | Mem Before | Mem After | Read Entries Before | Read Entries After | Write Entries Before | Write Entries After | Read Bytes Before | Read Bytes After | Write Bytes Before | Write Bytes After |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `create_stream` | 253,233 | 251,150 | 40,447 | 37,990 | 11 | 9 | 5 | 5 | 92 | 92 | 1,172 | 1,328 |
| `withdraw` | 252,787 | 255,114 | 40,205 | 39,450 | 9 | 8 | 4 | 4 | 92 | 92 | 1,072 | 1,072 |
| `settle` (`withdraw` of the full balance) | 252,787 | 255,114 | 40,205 | 39,450 | 9 | 8 | 4 | 4 | 92 | 92 | 1,072 | 1,072 |

Notes:

- `create_stream` improves CPU, memory, and entry-read pressure by moving contract-global bookkeeping off extra persistent keys.
- `withdraw` and full settlement reduce read pressure and memory while keeping write counts flat.
- `create_stream` writes slightly more bytes after packing the counter into instance storage, but it stays in the same fee bucket because both values round into the same 1 KB pricing increment.
- Entry counts include token transfer and Soroban auth bookkeeping, so the total read/write numbers are higher than the stream record touches alone.

### Enforced ceilings

`src/test.rs` now enforces the following ceilings:

- `create_stream`: `cpu <= 270_000`, `mem <= 45_000`, `reads <= 9`, `writes <= 5`, `read_bytes <= 100`, `write_bytes <= 1_400`
- `withdraw`: `cpu <= 275_000`, `mem <= 45_000`, `reads <= 8`, `writes <= 4`, `read_bytes <= 100`, `write_bytes <= 1_100`
- `settle`: `cpu <= 275_000`, `mem <= 45_000`, `reads <= 8`, `writes <= 4`, `read_bytes <= 100`, `write_bytes <= 1_100`

## Build Output

Command used:

```bash
cd contracts/contracts/streampay-stream
stellar contract build
```

Build result on 2026-05-27:

- WASM path: `contracts/target/wasm32v1-none/release/streampay_stream.wasm`
- WASM size: `12,993` bytes
- Exported functions: `8`

The workspace release profile in [contracts/Cargo.toml](../../Cargo.toml) is active for the Soroban build and uses:

- `opt-level = "z"`
- `lto = true`
- `codegen-units = 1`
- `panic = "abort"`
- `strip = "symbols"`

## Verification

Executed locally:

```bash
cd contracts
cargo test -p streampay-stream

cd contracts/contracts/streampay-stream
stellar contract build
```

Current result:

- `12/12` tests passing
- budget ceilings passing
- release WASM build passing

Coverage was not measured in this session because the workspace does not currently include a Rust coverage command in the crate workflow.
