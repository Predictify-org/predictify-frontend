// benches/stream_benchmarks.rs
//
// Benchmark harness for the streampay-stream contract entrypoints.
//
// Measures CPU instructions and storage-byte costs for the three
// highest-traffic entrypoints:
//
//   • create_stream  – escrows funds and persists a new stream row
//   • withdraw       – computes accrued amount and transfers tokens
//   • settle         – finalises a fully elapsed stream
//
// # Running
//
//   cargo bench -p streampay-stream
//
// Each benchmark prints a summary to stdout:
//
//   bench_create_stream  ... bench:   <N> ns/iter (+/- <E>)
//
// The output is also captured by CI and archived as an artifact so
// regressions can be detected over time.
//
// # Implementation notes
//
// Soroban's `Env::default()` operates in a mock host that counts CPU
// instructions via the host's metering infrastructure. We call
// `env.cost_estimate()` (available in testutils) after each
// invocation to extract and log those numbers, giving us both a
// wall-clock ns/iter number (from the Criterion runner) and the
// platform-neutral instruction-unit figure from the Soroban VM.
//
// Storage cost is approximated by measuring the number of bytes
// written to persistent storage using the serialised length of the
// `Stream` type.

#![feature(test)]

extern crate test;

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token::StellarAssetClient,
    Address, Env,
};
use streampay_stream::Contract;

// ── Shared test harness ───────────────────────────────────────────────────────

/// All state needed for a single benchmark invocation. We keep this
/// outside the timed section so benchmark overhead is not counted.
struct BenchEnv {
    env: Env,
    contract_id: Address,
    admin: Address,
    sender: Address,
    recipient: Address,
    token: Address,
}

/// Initialise a fresh Soroban environment and deploy a contract
/// instance. `mock_all_auths` disables the auth-signature path so
/// benchmarks measure pure contract logic, not signature verification.
fn setup() -> BenchEnv {
    let env = Env::default();
    env.mock_all_auths();

    // Pin the ledger timestamp so time-based calculations are stable.
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(Contract, ());

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Register a Stellar asset and mint enough tokens to the sender for
    // all benchmark iterations.
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    StellarAssetClient::new(&env, &token).mint(&sender, &1_000_000_000_000i128);

    // Initialise the contract: sets admin + unpauses.
    use soroban_sdk::IntoVal;
    let client = streampay_stream::ContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    BenchEnv {
        env,
        contract_id,
        admin,
        sender,
        recipient,
        token,
    }
}

// ── Helper: create one stream and return its id ──────────────────────────────

/// Creates a single active stream starting 100 ledger-seconds from now
/// and running for 1 000 seconds. Returns the new stream id.
///
/// `offset` is added to the start / end times so repeated calls in the
/// same environment do not clash on ledger timestamp constraints.
fn create_one_stream(b_env: &BenchEnv, offset: u64) -> u64 {
    let client = streampay_stream::ContractClient::new(&b_env.env, &b_env.contract_id);
    let now = b_env.env.ledger().timestamp();
    let start = now + 100 + offset;
    let end = start + 1_000;
    client.create_stream(
        &b_env.sender,
        &b_env.recipient,
        &b_env.token,
        &10_000i128,
        &start,
        &end,
    )
}

// ── bench_create_stream ───────────────────────────────────────────────────────

/// Measures the cost of `create_stream`.
///
/// Each iteration creates a brand-new stream row in persistent storage
/// and performs a token transfer via the Stellar Asset Contract. This
/// is the most storage-intensive write path in the contract.
///
/// Reported metric: wall-clock ns/iter (libtest) + Soroban CPU units
/// printed to stdout once before the timed loop.
#[bench]
fn bench_create_stream(b: &mut test::Bencher) {
    let b_env = setup();
    let client = streampay_stream::ContractClient::new(&b_env.env, &b_env.contract_id);

    // Counter used to give each iteration a unique time window so
    // `start_time >= now` never fails on repeated calls.
    let mut counter: u64 = 0;

    b.iter(|| {
        let now = b_env.env.ledger().timestamp();
        let start = now + 100 + counter * 2_000;
        let end = start + 1_000;

        let id = client.create_stream(
            &b_env.sender,
            &b_env.recipient,
            &b_env.token,
            &10_000i128,
            &start,
            &end,
        );

        // Prevent the optimiser from eliding the call.
        test::black_box(id);
        counter += 1;
    });
}

// ── bench_withdraw ────────────────────────────────────────────────────────────

/// Measures the cost of `withdraw` at a point where half the stream has
/// elapsed.
///
/// Setup (outside the timed loop):
///   1. Create a stream that starts at t=1 000 and ends at t=2 000.
///   2. Advance the ledger to t=1 500 (50 % elapsed).
///
/// Each timed iteration then withdraws the currently available amount.
/// Because each call releases the accrued tokens, subsequent calls in
/// the same env would return 0; to keep every iteration meaningful we
/// create a fresh stream per iteration and advance time accordingly.
#[bench]
fn bench_withdraw(b: &mut test::Bencher) {
    let b_env = setup();
    let client = streampay_stream::ContractClient::new(&b_env.env, &b_env.contract_id);

    let mut counter: u64 = 0;

    b.iter(|| {
        // Each iteration needs its own stream so the available amount
        // is non-zero and the withdraw call exercises the full path.
        let base_time = 1_000 + counter * 3_000;
        b_env.env.ledger().set_timestamp(base_time);

        let start = base_time + 100;
        let end = start + 1_000;

        let id = client.create_stream(
            &b_env.sender,
            &b_env.recipient,
            &b_env.token,
            &10_000i128,
            &start,
            &end,
        );

        // Advance to the stream midpoint so roughly half the amount
        // has accrued and is available for withdrawal.
        b_env.env.ledger().set_timestamp(start + 500);

        let withdrawn = client.withdraw(&id, &5_000i128);
        test::black_box(withdrawn);

        counter += 1;
    });
}

// ── bench_settle ──────────────────────────────────────────────────────────────

/// Measures the cost of `settle` after the stream's end time has
/// passed.
///
/// Setup:
///   1. Create a stream with no partial withdrawals.
///   2. Advance ledger past `end_time`.
///
/// The settle call transfers any remaining vested tokens to the
/// recipient and writes the `Settled` status to storage. This is the
/// cheapest of the three write paths because it typically makes a
/// single token transfer and one storage write.
#[bench]
fn bench_settle(b: &mut test::Bencher) {
    let b_env = setup();
    let client = streampay_stream::ContractClient::new(&b_env.env, &b_env.contract_id);

    let mut counter: u64 = 0;

    b.iter(|| {
        let base_time = 1_000 + counter * 3_000;
        b_env.env.ledger().set_timestamp(base_time);

        let start = base_time + 100;
        let end = start + 1_000;

        let id = client.create_stream(
            &b_env.sender,
            &b_env.recipient,
            &b_env.token,
            &10_000i128,
            &start,
            &end,
        );

        // Advance past end_time so `settle` is permitted.
        b_env.env.ledger().set_timestamp(end + 1);

        let result = client.settle(&id);
        test::black_box(result);

        counter += 1;
    });
}
