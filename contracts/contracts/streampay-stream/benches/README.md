# streampay-stream – Benchmark Harness

This directory contains the libtest benchmark suite for the
`streampay-stream` Soroban smart-contract.  It measures the wall-clock
execution time (ns/iter) of the three highest-traffic write entrypoints
and logs Soroban CPU/storage cost units so regressions can be caught
before they reach mainnet.

## Benchmarks

| Benchmark | What it measures |
|---|---|
| `bench_create_stream` | Escrow token transfer + persistent stream row creation |
| `bench_withdraw` | Accrual calculation + partial token transfer out |
| `bench_settle` | Full finalisation transfer + `Settled` status write |

## Running locally

```bash
# From the repo root
cargo bench -p streampay-stream

# Or from the contracts/ workspace root
cargo bench -p streampay-stream
```

> **Nightly required.** The libtest `#[bench]` attribute requires a
> nightly Rust compiler.  The `contracts/rust-toolchain.toml` file pins
> the correct channel so `rustup` selects it automatically — no manual
> installation needed.

### Example output

```
test bench_create_stream ... bench:      12,345 ns/iter (+/- 678)
test bench_withdraw      ... bench:       9,876 ns/iter (+/- 432)
test bench_settle        ... bench:       8,123 ns/iter (+/- 301)
```

## CI integration

The benchmarks run automatically via
`.github/workflows/bench.yml`:

- **Nightly schedule** – every day at 02:00 UTC.
- **On push to `main`** – when any file under `contracts/` changes.
- **Manual dispatch** – trigger via the GitHub Actions UI for one-off
  profiling runs.

Raw output is archived as a workflow artifact (90-day retention) under
the name `bench-results-<run-id>` so numbers can be compared across runs.

## Interpreting results

| Term | Meaning |
|---|---|
| `ns/iter` | Median wall-clock nanoseconds for one benchmark iteration |
| `+/- N` | Standard deviation across iterations |

A significant increase in `ns/iter` for a given benchmark usually
indicates either additional storage reads/writes or a more complex
compute path was introduced.  Compare against the most recent archived
artifact before merging.

## Adding new benchmarks

1. Add a `#[bench]` function to `benches/stream_benchmarks.rs`.
2. Follow the existing pattern:
   - All setup (env creation, contract registration, token mint) goes
     **outside** the `b.iter(|| { … })` closure.
   - Use `test::black_box(…)` on every return value to prevent the
     compiler from optimising away the call.
   - Use an incrementing `counter` to vary time windows across
     iterations so no two calls share the same ledger timestamp.
3. Update this README table.
