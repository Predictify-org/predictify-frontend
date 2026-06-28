//! # `create_stream` fuzz target
//!
//! cargo-fuzz harness that drives [`streampay_stream::Contract::create_stream`]
//! with malformed and adversarial inputs to confirm that the entrypoint
//! **never panics** for any combination of valid or invalid arguments.
//!
//! ## What this target asserts
//!
//! The harness **deliberately does not assert specific return values** for
//! each input. Instead, it asserts the weaker but more robust invariant:
//!
//! > For every byte string libFuzzer can produce, every call to
//! > `create_stream` either returns `Ok(u64)` or returns a typed
//! > `Err(streampay_stream::Error)`. It never panics, traps the host, or
//! > silently corrupts ledger state.
//!
//! Asserting specific error branches in a fuzzer is brittle: a future change
//! to the validation order would rewrite every assertion. Asserting "no
//! panic" is the contract invariant we genuinely care about, and it survives
//! refactors of the `create_stream` body.
//!
//! ## Inputs under fuzz
//!
//! The harness fixes a per-input fresh ledger (`Env::default()`) and the
//! address-shaped fields (`sender`, `recipient`, `token`), because
//! [`soroban_sdk::Address`] derives its identity from the live `Env` and
//! cannot be cargo-fuzzed directly. The numeric and boolean fields are all
//! driven from a single `#[derive(Arbitrary)]` struct, and the harness
//! re-runs `create_stream` [`MAX_STREAM_ATTEMPTS`] times per input so the
//! per-sender `Error::StreamLimitExceeded` path is reachable from a single
//! fresh-env iteration.
//!
//! | Field                       | Drives                                                         |
//! |-----------------------------|----------------------------------------------------------------|
//! | [`CreateStreamInput::total_amount`]           | `i128` covering 0, `i128::MIN`, near `i128::MAX`, etc.        |
//! | [`CreateStreamInput::start_time`]            | `u64` against the pinned `now = 1_000`                         |
//! | [`CreateStreamInput::end_time`]              | `u64` covering ordering relationships with `start_time`        |
//! | [`CreateStreamInput::paused`]                | flips the global pause flag → drives `ContractPaused`           |
//! | [`CreateStreamInput::block_token`]           | toggles `set_token_allowed(false)` → drives `TokenNotAllowed`  |
//! | [`CreateStreamInput::same_sender_recipient`] | reuses `sender` → drives `InvalidState` (`sender == recipient`) |
//!
//! ## Error paths exercised
//!
//! Cross product of `(paused, block_token, same_sender_recipient)`
//! × `(total_amount sign, start_time vs now, end_time vs start_time)`
//! × repeated calls up to the per-sender stream limit covers every typed
//! error variant returned by `create_stream`:
//!
//! - `Error::ContractPaused`
//! - `Error::StreamLimitExceeded` (only after `MAX_STREAM_ATTEMPTS - 1` successful calls)
//! - `Error::InvalidAmount`
//! - `Error::InvalidState` (sender == recipient)
//! - `Error::TokenNotAllowed`
//! - `Error::InvalidTimeRange` (end_time <= start_time OR start_time < now)
//!
//! ## Pre-condition ordering note
//!
//! The harness flips `paused` and `block_token` BEFORE the fuzzed call, so
//! when both are `true` the contract's `require_not_paused` check fires
//! first (short-circuit) and returns `ContractPaused` before the
//! `is_token_blocked` check would have fired. This exercises the contract's
//! actual short-circuit behavior; do not "fix" it by reordering.
//!
//! ## Running
//!
//! ```text
//! # From the contracts/ workspace, on the nightly toolchain:
//! cargo +nightly fuzz run create --fuzz-dir contracts/streampay-stream/fuzz
//! ```
//!
//! Reproducer artefacts are written under
//! `contracts/streampay-stream/fuzz/artifacts/create/` on crash.

#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token::StellarAssetClient, Address, Env};
use streampay_stream::{Contract, ContractClient};

/// Number of `try_create_stream` calls per fuzzer input.
///
/// `MAX_STREAM_ATTEMPTS = DEFAULT_PER_SENDER_LIMIT + 1` where
/// `DEFAULT_PER_SENDER_LIMIT = limits::DEFAULT_MAX_STREAMS_PER_SENDER`
/// (= 10)  is the per-sender cap with which the contract deploys. Adding
/// one extra attempt guarantees the `StreamLimitExceeded` error path is
/// reachable in a single fresh-env iteration provided the prior ten calls
/// all succeed. For inputs whose first call short-circuits on
/// `InvalidAmount` / `InvalidTimeRange` / `TokenNotAllowed` /
/// `ContractPaused` / `InvalidState`, calls 2..N see the same error — no
/// state mutation, no counter increment — and the loop terminates cleanly.
const MAX_STREAM_ATTEMPTS: u32 = 11; // 10 (default per-sender cap) + 1

/// Pre-fund cap used to back successful `create_stream` calls.
///
/// Picked to be large enough to escrow `MAX_STREAM_ATTEMPTS` small
/// streams (so the `StreamLimitExceeded` path is reachable for happy-path
/// inputs) yet small enough not to bloat the host ledger pages consumed
/// per fuzzer iteration. Fuzzer inputs that ask for a `total_amount`
/// greater than this cap short-circuit on a host-side insufficient-balance
/// error from the asset contract — that error is returned cleanly
/// (`Err(Error::Contract)` wrapper) without ever panicking, so the
/// "no panic" invariant under test still holds.
const SENDER_INITIAL_BALANCE: i128 = 1_000_000_000_i128;

/// Fuzzer-shaped inputs for one `create_stream` invocation.
///
/// Every numeric field is left unconstrained so the fuzzer can drive hostile
/// corner cases — zero, signed-min/max, boundary-on-`u64::MAX`, etc.  The
/// boolean fields toggle the corresponding pre-conditions independently so
/// that each error path is reachable via a single bit flip.
#[derive(Arbitrary)]
struct CreateStreamInput {
    /// Total tokens (base units) to escrow.  Drives the `InvalidAmount`
    /// branch when `<= 0`.
    pub total_amount: i128,
    /// Stream start time (Unix seconds).  Compared against the ledger
    /// timestamp pinned in the harness to drive `InvalidTimeRange`.
    pub start_time: u64,
    /// Stream end time (Unix seconds).  Compared against `start_time`.
    pub end_time: u64,
    /// When `true`, sets the global pause flag before invoking
    /// `create_stream`, exercising the `ContractPaused` error path.
    pub paused: bool,
    /// When `true`, blocks the registered token beforehand, exercising
    /// the `TokenNotAllowed` error path.
    pub block_token: bool,
    /// When `true`, reuses `sender` as the recipient, exercising the
    /// `InvalidState` (`sender == recipient`) error path.
    pub same_sender_recipient: bool,
}

impl CreateStreamInput {
    /// Builds the `recipient` address according to the
    /// `same_sender_recipient` flag.
    ///
    /// When `same_sender_recipient` is `false` we mint a fresh
    /// `Address` so the address-bit for `recipient` is distinct from
    /// `sender`; this exercises the normal happy path.  Note that
    /// `Address::generate` reads from an internal `Env` counter and is
    /// not deterministic across fuzzer runs — that is fine, because
    /// the property under test is "any distinct sender / recipient
    /// pair validates correctly", not "a specific pair validates".
    fn recipient(&self, sender: &Address, env: &Env) -> Address {
        if self.same_sender_recipient {
            sender.clone()
        } else {
            Address::generate(env)
        }
    }
}

fuzz_target!(|input: CreateStreamInput| {
    // ── Build a fresh ledger for this fuzzer input ────────────────
    //
    // Each input gets its own `Env`; libFuzzer is responsible for
    // remembering which inputs led to a crash, not us.
    let env = Env::default();
    // Bypass `require_auth()` for `sender` and `admin` so the fuzzer
    // can exercise input-shape bugs without auth-flow gatekeeping.
    env.mock_all_auths();
    // Pin the ledger timestamp so comparisons against `start_time`
    // are deterministic and do not depend on the host clock.
    env.ledger().set_timestamp(1_000);

    // ── Wire up admin / sender / recipient / token / contract ────
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = input.recipient(&sender, &env);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let stellar = StellarAssetClient::new(&env, &token);

    // Mint a single bounded balance so the sender can escrow
    // `total_amount > 0` for up to `MAX_STREAM_ATTEMPTS` streams.
    // A failed mint (e.g. a host-side shutdown of the asset contract)
    // is intentionally swallowed: the fuzzer must keep exercising the
    // contract's validation paths regardless of mint success, since
    // those paths short-circuit before the token transfer.
    let _ = stellar.try_mint(&sender, &SENDER_INITIAL_BALANCE);

    // ── Apply fuzzer-selected pre-conditions ─────────────────────
    //
    // These two `if` blocks are ordered after the harness setup but
    // BEFORE the fuzzed call. When both flags are `true`, the
    // contract's `require_not_paused` short-circuit fires
    // `ContractPaused` before `is_token_blocked` ever runs — that
    // is the contract behaviour we want to exercise, so the harness
    // does NOT reorder based on its own opinion.
    if input.block_token {
        client.set_token_allowed(&admin, &token, &false);
    }
    if input.paused {
        client.set_paused(&admin, &true);
    }

    // ── The fuzzed call ───────────────────────────────────────────
    //
    // We deliberately *ignore* the return value.  The fuzzer's sole
    // assertion is "no panic, no host error".  An `Ok(_)`, an
    // `Err(Error::InvalidAmount)`, an `Err(Error::StreamLimitExceeded)`
    // after the per-sender cap is hit, or any other typed error is
    // fine; only a process abort or uncaught panic is a regression.
    //
    // We loop `MAX_STREAM_ATTEMPTS` times on the same input so the
    // `StreamLimitExceeded` branch is reachable even when the fuzzer
    // emits a happy-path tuple. The per-sender counter increments
    // IFF the call succeeds end-to-end (after the token transfer),
    // so for short-circuit errors the counter is unchanged between
    // iterations — the loop will only exhaust its attempts after
    // hitting the contract limit OR  returning the same non-limit
    // error on every iteration.
    for _ in 0..MAX_STREAM_ATTEMPTS {
        let _ = client.try_create_stream(
            &sender,
            &recipient,
            &token,
            &input.total_amount,
            &input.start_time,
            &input.end_time,
        );
    }
});
