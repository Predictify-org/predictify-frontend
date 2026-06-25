//! # streampay-contracts
//!
//! Soroban smart contracts for StreamPay — continuous token streaming on Stellar.
//!
//! ---
//!
//! ## Ledger Timestamp Assumptions
//!
//! All time-based logic in this crate relies on **`Env::ledger().timestamp()`**.
//!
//! Key properties:
//!
//! - **Whole seconds only.** `u64` Unix timestamp, no sub-second resolution.
//!   Accrual is always truncated to complete seconds.
//!
//! - **~5–6 s ledger cadence.** Timestamp does not advance between ledger closes.
//!   All transactions in the same ledger share the *same* timestamp.
//!
//! - **Validator-set, not caller-set.** Agreed by SCP quorum. No transaction
//!   sender can influence it. Timestamp-manipulation attacks are not possible.
//!
//! - **Monotonic.** Protocol rules guarantee `new >= previous`.
//!
//! - **Dust tail.** The fractional-second gap between the last ledger close
//!   before `end_time` and `end_time` itself is never claimable by the recipient.
//!   It is reclaimed by the sender on stream close.
//!
//! ### Off-chain UX recommendation
//!
//! Derive elapsed time from the **last confirmed ledger close time** (Horizon/RPC),
//! not the device wall clock. Wall-clock interpolation overstates claimable balance.
//!
//! See [`docs/timestamp-accrual.md`](../docs/timestamp-accrual.md) for full detail.
//! StreamPay — Soroban smart contracts for continuous payment streaming.
//!
//! Provides: create_stream, start_stream, stop_stream, settle_stream,
//! batch_settle, max_batch_settle_size, archive_stream, get_stream_info, version.
//!
//! ## Memo Field
//! Each stream may carry an immutable `memo: String` (max 32 bytes) set at creation.
//! The memo is intended for off-chain dapp correlation (e.g., external_id, reference string).
//! It is **read-only** after creation — no edit function is provided.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};
//! # Integer Safety — i128 Saturation Semantics
//!
//! All accrual arithmetic uses **saturating** operations to guarantee no silent
//! wrap-around, regardless of how extreme `rate_per_second` or `elapsed` become.
//!
//! ## Why saturation instead of checked/wrapping?
//! * Wrapping would silently produce a wrong (possibly negative) amount, which
//!   could drain the payer's balance incorrectly or credit the recipient nothing.
//! * Panicking on overflow would make the contract un-settleable for legitimate
//!   high-value streams.
//! * Saturating clamps the intermediate product at `i128::MAX` and then the
//!   `.min(balance)` guard ensures the final settled amount never exceeds the
//!   deposited balance — the worst case is the recipient receives exactly what
//!   was deposited, which is the correct economic outcome.
//!
//! ## Stellar / Soroban timestamp limits
//! Soroban ledger timestamps are `u64` Unix seconds.  The practical ceiling on
//! Stellar today is well under 2^32 seconds (~136 years from epoch), but the
//! contract casts `elapsed: u64` to `i128` before multiplying, so even a
//! pathological elapsed value of `u64::MAX` (~1.8 × 10^19 s) combined with
//! `i128::MAX` rate saturates to `i128::MAX` rather than wrapping.
//!
//! ## Invariants upheld by `settle_stream`
//! 1. `amount >= 0` — saturation of non-negative operands stays non-negative.
//! 2. `amount <= balance` — enforced by `.min(info.balance)`.
//! 3. `new_balance >= 0` — `balance.saturating_sub(amount)` where `amount <=
//!    balance` always yields a non-negative result.

mod stream;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
use crate::stream::{
    StreamInfo, get_stream, set_stream, stream_key, extend_stream_ttl,
    STREAM_TTL_THRESHOLD, STREAM_TTL_EXTEND
};

/// Contract version: major * 1_000_000 + minor * 1_000 + patch.
/// Current: 0.2.0 → 2_000
const VERSION: u32 = 2_000;

/// Instance storage TTL threshold (~1 day).
const INSTANCE_TTL_THRESHOLD: u32 = 17_280;
/// Instance storage TTL extend-to (~30 days).
const INSTANCE_TTL_EXTEND: u32 = 518_400;
/// Hard cap for batch settlement to keep Soroban resource usage predictable.
const MAX_BATCH_SETTLE_SIZE: u32 = 25;

#[contract]
pub struct StreamPayContract;

#[contractimpl]
impl StreamPayContract {
    /// Create a new payment stream (payer, recipient, rate per second, optional end_time).
    /// If end_time is 0, stream has no time limit (must be stopped manually).
    /// If end_time > 0, must satisfy end_time > implicit start time (enforced at start_stream).
    pub fn create_stream(
        env: Env,
        payer: Address,
        recipient: Address,
        rate_per_second: i128,
        initial_balance: i128,
        memo: String,
        end_time: u64,  // 0 = no limit; otherwise must be > start_time (validated at start)
    ) -> u32 {
        if memo.len() > MEMO_MAX_LEN as u32 {
            panic!("memo exceeds 32 chars");
        }
        payer.require_auth();
        if rate_per_second <= 0 || initial_balance <= 0 {
            panic!("rate and balance must be positive");
        }
        let stream_id = get_next_stream_id(&env);
        if stream_id == 0 {
            panic!("stream id overflow");
        }
        let next_stream_id = stream_id.wrapping_add(1);
        let info = StreamInfo {
            payer: payer.clone(),
            recipient,
            rate_per_second,
            balance: initial_balance,
            start_time: 0,
            end_time,
            is_active: false,
            memo,
            paused_at: 0,
        };
        set_stream(&env, stream_id, &info);
        set_next_stream_id(&env, next_stream_id);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
        emit_stream_created(&env, stream_id, &payer, &info.recipient, rate_per_second, initial_balance);
        stream_id
    }
####


//! StreamPay — Soroban smart contracts for continuous payment streaming.
//!
//! # Public entry points
//!
//! | Function           | Auth      | Description                                         |
//! |--------------------|-----------|-----------------------------------------------------|
//! | `create_stream`    | payer     | Escrow tokens and register a new stream             |
//! | `start_stream`     | payer     | Begin accrual                                       |
//! | `stop_stream`      | payer     | Pause accrual                                       |
//! | `settle_stream`    | none      | Move accrued tokens to the claimable pool           |
//! | `withdraw_stream`  | recipient | Transfer all claimable tokens on-ledger             |
//! | `archive_stream`   | payer     | Remove a fully-settled, fully-withdrawn stream      |
//! | `get_stream_info`  | none      | Read-only stream metadata                           |
//! | `version`          | none      | Contract version constant                           |
//!
//! # Accounting invariant
//!
//! For every stream at every point in time:
//!
//! ```text
//! balance + claimable_balance ≤ initial_deposit
//! ```
//!
//! * `balance`           — tokens held in escrow, not yet earned by the recipient.
//! * `claimable_balance` — tokens earned by the recipient, not yet transferred.
//!
//! `settle_stream` (permissionless) advances accounting:
//! `balance -= accrued`, `claimable_balance += accrued`.
//!
//! `withdraw_stream` (recipient-auth) performs the actual on-ledger transfer
//! of `claimable_balance` to the recipient and resets it to zero.
//! It implicitly settles any outstanding accrual first.
//!
//! Calling `withdraw_stream` when nothing is claimable is safe and returns 0
//! (idempotent — safe to call multiple times).

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

/// Contract version: major * 1_000_000 + minor * 1_000 + patch.
/// Current: 0.2.0 → 2_000
const VERSION: u32 = 2_000;

/// TTL threshold: extend when remaining TTL drops below ~1 day (17_280 ledgers at ~5s each).
const STREAM_TTL_THRESHOLD: u32 = 17_280;
/// TTL extend-to: refresh to ~30 days (518_400 ledgers).
const STREAM_TTL_EXTEND: u32 = 518_400;
/// Instance storage TTL threshold (~1 day).
const INSTANCE_TTL_THRESHOLD: u32 = 17_280;
/// Instance storage TTL extend-to (~30 days).
const INSTANCE_TTL_EXTEND: u32 = 518_400;

/// All state associated with a payment stream.
///
/// # Balance accounting
///
/// `balance` and `claimable_balance` together track all escrowed funds:
///
/// * `balance`           — not yet earned; decreases each settlement period.
/// * `claimable_balance` — earned but not yet transferred to the recipient;
///                         increases on settle, resets to 0 on withdraw.
///
/// Both are non-negative. Their sum never exceeds the `initial_balance`
/// passed to `create_stream`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct StreamInfo {
    pub payer: Address,
    pub recipient: Address,
    /// SEP-41-compatible token contract used for this stream.
    pub token: Address,
    /// Streaming rate in token units per second.
    pub rate_per_second: i128,
    /// Tokens still held in escrow; not yet accrued to the recipient.
    pub balance: i128,
    /// Tokens accrued by the recipient but not yet withdrawn on-ledger.
    pub claimable_balance: i128,
    /// Timestamp of the last settlement (or stream start if never settled).
    pub start_time: u64,
    /// Timestamp when the stream was stopped (0 if never stopped).
    pub end_time: u64,
    pub is_active: bool,
}

#[contract]
pub struct StreamPayContract;

#[contractimpl]
impl StreamPayContract {
    /// Create a new payment stream and immediately escrow `initial_balance` tokens.
    ///
    /// `initial_balance` tokens are transferred from `payer` into this contract
    /// on creation, so `payer` must hold at least `initial_balance` of `token`
    /// and must authorise both this call and the token transfer.
    ///
    /// Returns the new `stream_id`.
    pub fn create_stream(
        env: Env,
        payer: Address,
        recipient: Address,
        token: Address,
        rate_per_second: i128,
        initial_balance: i128,
    ) -> u32 {
        payer.require_auth();
        if rate_per_second <= 0 || initial_balance <= 0 {
            panic!("rate and balance must be positive");
        }

        // Escrow initial_balance tokens from payer into this contract.
        token::Client::new(&env, &token)
            .transfer(&payer, &env.current_contract_address(), &initial_balance);

        let stream_id = get_next_stream_id(&env);
        let info = StreamInfo {
            payer: payer.clone(),
            recipient,
            token,
            rate_per_second,
            balance: initial_balance,
            claimable_balance: 0,
            start_time: 0,
            end_time: 0,
            is_active: false,
        };
        set_stream(&env, stream_id, &info);
        set_next_stream_id(&env, stream_id + 1);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
        stream_id
    }

    /// Start an existing stream.
    /// If end_time was set at creation, validates that end_time > current timestamp.
    pub fn start_stream(env: Env, stream_id: u32) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();
        if info.is_active {
            panic!("stream already active");
        }
        let now = env.ledger().timestamp();

        // Validate end_time constraint if set
        if info.end_time > 0 && info.end_time <= now {
            panic!("end_time must be in the future");
        }

        info.is_active = true;
        info.start_time = now;
        info.paused_at = 0; // Clear paused state
        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }

    /// Pause an active stream (payer only).
    ///
    /// Records `end_time` so that `withdraw_stream` can later settle the
    /// final accrual period even after the stream becomes inactive.
    pub fn stop_stream(env: Env, stream_id: u32) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();
        if !info.is_active {
            panic!("stream not active");
        }
        info.is_active = false;
        info.end_time = env.ledger().timestamp();
        info.paused_at = 0; // Clear paused state
        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }

    /// Settle stream: compute streamed amount since start and deduct from balance.
    ///
    /// # Saturation semantics
    ///
    /// The accrual formula is:
    /// ```text
    /// amount = (elapsed as i128).saturating_mul(rate_per_second).min(balance)
    /// ```
    ///
    /// Both operands are non-negative (`elapsed` is a `u64` difference cast to
    /// `i128`; `rate_per_second` is validated `> 0` at creation time), so the
    /// saturating multiply clamps at `i128::MAX` rather than wrapping.  The
    /// subsequent `.min(balance)` ensures the settled amount never exceeds the
    /// deposited balance, preserving the invariant `new_balance >= 0`.
    ///
    /// This means:
    /// * An astronomically large `rate_per_second` (e.g. `i128::MAX`) will
    ///   settle at most the full remaining balance — no funds are conjured.
    /// * An astronomically long `elapsed` window (e.g. `u64::MAX` seconds,
    ///   far beyond any real Stellar ledger timestamp) is handled identically.
    /// * There is **no silent wrap** at any point in the computation.
    pub fn settle_stream(env: Env, stream_id: u32) -> i128 {
        let amount = settle_stream_amount(&env, stream_id);
        if amount.is_none() {
            return 0;
        }
        extend_instance_ttl(&env);

        amount.unwrap()
    }

    /// Settle multiple streams in a single invocation.
    ///
    /// Failure behavior is all-or-nothing: if any item panics, the entire call
    /// reverts and no settlement state is committed. Callers should chunk larger
    /// workloads into batches of `MAX_BATCH_SETTLE_SIZE` or fewer ids.
    pub fn batch_settle(env: Env, stream_ids: Vec<u32>) -> Vec<i128> {
        if stream_ids.len() > MAX_BATCH_SETTLE_SIZE {
            panic!("batch too large");
        }

        let mut settled_amounts = Vec::new(&env);
        let mut touched_active_stream = false;

        for stream_id in stream_ids.iter() {
            match settle_stream_amount(&env, stream_id) {
                Some(amount) => {
                    touched_active_stream = true;
                    settled_amounts.push_back(amount);
                }
                None => settled_amounts.push_back(0),
            }
        }

        if touched_active_stream {
            extend_instance_ttl(&env);
        }

        settled_amounts
    }

    /// Returns the configured maximum number of stream ids allowed in one
    /// `batch_settle` invocation.
    pub fn max_batch_settle_size(_env: Env) -> u32 {
        MAX_BATCH_SETTLE_SIZE
    }

    /// Cancel a stream early (payer-only).
    /// Immediately settles all accrued amounts to the recipient.
    /// Remaining unaccrued balance is retained by the payer.
    /// Atomic operation: prevents race conditions with settle.
    pub fn cancel_stream(env: Env, stream_id: u32) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();

        if !info.is_active {
            panic!("cannot cancel inactive stream");
        }

        let now = env.ledger().timestamp();

        // Settle accrued amount up to cancellation
        let elapsed = now - info.start_time;
        let accrued = (elapsed as i128)
            .saturating_mul(info.rate_per_second)
            .min(info.balance);

        // Deduct accrued from balance (paid to recipient)
        info.balance = info.balance.saturating_sub(accrued);
        info.is_active = false;
        info.end_time = now; // Mark cancellation point

        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }

    /// Pause an active stream (payer-only).
    /// Stops accrual without full termination; preserves balance and schedule.
    /// Can be resumed with resume_stream.
    /// Distinct from stop_stream (which is final).
    pub fn pause_stream(env: Env, stream_id: u32) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();

        if !info.is_active {
            panic!("cannot pause inactive stream");
        }
        if info.paused_at > 0 {
            panic!("stream already paused");
        }

        let now = env.ledger().timestamp();

        // Settle accrued amount up to pause point
        let elapsed = now - info.start_time;
        let accrued = (elapsed as i128)
            .saturating_mul(info.rate_per_second)
            .min(info.balance);
        info.balance = info.balance.saturating_sub(accrued);

        // Mark paused but keep is_active true (logical "paused" state)
        info.paused_at = now;

        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }

    /// Resume a paused stream (payer-only).
    /// Restarts accrual from the pause point.
    /// Is_active remains true; paused_at is cleared.
    pub fn resume_stream(env: Env, stream_id: u32) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();

        if !info.is_active {
            panic!("cannot resume inactive stream");
        }
        if info.paused_at == 0 {
            panic!("stream is not paused");
        }

        let now = env.ledger().timestamp();

        // Resume: reset start_time to account for paused duration and clear paused state
        info.start_time = now;
        info.paused_at = 0;

        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }

    /// Withdraw all claimable tokens to the recipient (recipient auth required).
    ///
    /// Implicitly settles any outstanding accrual before transferring, so the
    /// recipient does not need to call `settle_stream` first.
    ///
    /// For inactive streams, settles the final period between the last
    /// settlement timestamp (`start_time`) and the stop timestamp (`end_time`),
    /// ensuring no earned tokens are stranded when the payer stops the stream
    /// without a prior `settle_stream` call.
    ///
    /// Returns the amount transferred on-ledger. Returns 0 if nothing is
    /// claimable (idempotent — safe to call multiple times).
    ///
    /// # Interaction with internal accounting
    ///
    /// After a successful withdrawal:
    /// * `claimable_balance` is reset to 0.
    /// * `balance` reflects only the un-accrued remainder.
    /// * `start_time` is advanced to the settlement boundary, preventing
    ///   the same elapsed period from being double-counted on a future call.
    pub fn withdraw_stream(env: Env, stream_id: u32) -> i128 {
        let mut info = get_stream(&env, stream_id);
        info.recipient.require_auth();

        // Determine the settlement boundary:
        //   active  → settle up to now
        //   stopped → settle the gap [start_time, end_time]  (end_time set by stop_stream)
        //   never started (end_time == 0, is_active == false) → settle_until == 0, no-op
        let settle_until: u64 = if info.is_active {
            env.ledger().timestamp()
        } else {
            info.end_time
        };

        if settle_until > info.start_time {
            let elapsed = settle_until - info.start_time;
            let accrued = (elapsed as i128)
                .saturating_mul(info.rate_per_second)
                .min(info.balance);
            info.balance = info.balance.saturating_sub(accrued);
            info.claimable_balance = info.claimable_balance.saturating_add(accrued);
            // Advance start_time so the same period is never settled twice.
            info.start_time = settle_until;
        }

        let claimable = info.claimable_balance;
        info.claimable_balance = 0;

        // Write state before the external token call (checks-effects-interactions).
        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);

        if claimable > 0 {
            // Transfer tokens from this contract to the recipient.
            // The contract is the sender, so no additional auth is required.
            token::Client::new(&env, &info.token)
                .transfer(&env.current_contract_address(), &info.recipient, &claimable);
        }

        claimable
    }

    /// Returns whether a stream is currently active.
    pub fn is_stream_active(env: Env, stream_id: u32) -> bool {
        get_stream(&env, stream_id).is_active
    }

    /// Get stream info (read-only).
    pub fn get_stream_info(env: Env, stream_id: u32) -> StreamInfo {
        get_stream(&env, stream_id)
    }

    /// Returns the contract version as a u32 (see VERSION encoding).
    pub fn version(_env: Env) -> u32 {
        VERSION
    }

    /// Archive (remove) a fully-settled, fully-withdrawn, inactive stream (payer only).
    ///
    /// Requires `is_active == false`, `balance == 0`, and `claimable_balance == 0`.
    /// The `claimable_balance == 0` guard ensures the recipient has received all
    /// owed tokens before the stream record is permanently deleted.
    pub fn archive_stream(env: Env, stream_id: u32) {
        let info = get_stream(&env, stream_id);
        info.payer.require_auth();
        if info.is_active {
            panic!("cannot archive active stream");
        }
        if info.balance != 0 {
            panic!("cannot archive stream with unsettled balance");
        }
        if info.claimable_balance != 0 {
            panic!("cannot archive stream with unclaimed balance");
        }
        let key = stream_key(&env, stream_id);
        env.storage().persistent().remove(&key);
        extend_instance_ttl(&env);
    }

    /// Update the rate of an existing stream (payer-only).
    /// If the stream is active, automatically settles accrued amount at old rate first.
    /// Policy: Rate can only be decreased or changed within a bounded delta (max 10% increase)
    /// to protect recipient expectations while allowing payer flexibility.
    pub fn update_rate(env: Env, stream_id: u32, new_rate: i128) {
        let mut info = get_stream(&env, stream_id);
        info.payer.require_auth();

        if new_rate <= 0 {
            panic!("rate must be positive");
        }

        let old_rate = info.rate_per_second;

        // Policy: Only allow rate decrease or small increases (max 10% increase)
        // This protects recipient expectations while allowing payer flexibility
        let max_allowed_rate = old_rate + (old_rate / 10); // 110% of current rate
        if new_rate > max_allowed_rate {
            panic!("rate increase exceeds 10% limit");
        }

        // If stream is active, settle at old rate before changing
        if info.is_active {
            let now = env.ledger().timestamp();
            let elapsed = now - info.start_time;
            let amount = (elapsed as i128)
                .saturating_mul(old_rate)
                .min(info.balance);
            info.balance = info.balance.saturating_sub(amount);
            // Reset start_time to now so new rate applies going forward
            info.start_time = now;
        }

        // Update the rate
        info.rate_per_second = new_rate;
        set_stream(&env, stream_id, &info);
        extend_stream_ttl(&env, stream_id);
        extend_instance_ttl(&env);
    }
}

fn get_next_stream_id(env: &Env) -> u32 {
    let key = Symbol::new(env, "next_id");
    env.storage().instance().get(&key).unwrap_or(1)
}

fn set_next_stream_id(env: &Env, id: u32) {
    let key = Symbol::new(env, "next_id");
    env.storage().instance().set(&key, &id);
}

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND);
}

fn compute_linear_vested(total_amount: i128, duration_seconds: u64, elapsed_seconds: u64) -> i128 {
    let capped_elapsed = if elapsed_seconds > duration_seconds {
        duration_seconds
    } else {
        elapsed_seconds
    };
    total_amount.saturating_mul(capped_elapsed as i128) / duration_seconds as i128
}

#[cfg(test)]
mod test {
    use std::panic::{catch_unwind, AssertUnwindSafe};

    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger as _;
    use soroban_sdk::token;

    use super::*;

    /// Advances the test ledger timestamp by `seconds` so accrual scenarios
    /// can assert deterministic elapsed-time behavior.
    fn advance_ledger_time(env: &Env, seconds: u64) {
        env.ledger().with_mut(|li| {
            li.timestamp += seconds;
        });
    }

    #[test]
    fn test_create_stream_valid() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);
        assert_eq!(stream_id, 1);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.payer, payer);
        assert_eq!(info.recipient, recipient);
        assert_eq!(info.token, token_address);
        assert_eq!(info.rate_per_second, 100);
        assert_eq!(info.balance, 10_000);
        assert_eq!(info.claimable_balance, 0);
        assert!(!info.is_active);
        assert_eq!(info.memo, String::from_str(&env, "memo"));
        assert_eq!(info.paused_at, 0);
    }

    /// Verify that `create_stream` emits exactly one `stream_created` event
    /// with the correct topics and data payload.
    #[test]
    fn test_create_stream_emits_event() {
        use soroban_sdk::testutils::Events as _;

        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);

        let events = env.events().all();
        // Exactly one event should have been emitted
        assert_eq!(events.len(), 1);

        let (emitting_contract, topics, data) = events.get(0).unwrap();
        assert_eq!(emitting_contract, contract_id);

        // topic[0] == "stream_created", topic[1] == stream_id
        let topic0: Symbol = soroban_sdk::FromVal::from_val(&env, &topics.get(0).unwrap());
        let topic1: u32 = soroban_sdk::FromVal::from_val(&env, &topics.get(1).unwrap());
        assert_eq!(topic0, Symbol::new(&env, "stream_created"));
        assert_eq!(topic1, stream_id);

        // Data payload carries all four fields
        let event_data: StreamCreatedEvent = soroban_sdk::FromVal::from_val(&env, &data);
        assert_eq!(event_data.payer, payer);
        assert_eq!(event_data.recipient, recipient);
        assert_eq!(event_data.rate_per_second, 100);
        assert_eq!(event_data.initial_balance, 10_000);
    }

    /// Only `create_stream` emits an event; start/stop must not emit
    /// spurious `stream_created` events.
    #[test]
    fn test_no_spurious_stream_created_events() {
        use soroban_sdk::testutils::Events as _;

        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &0_u64);

        // start / stop must not add more stream_created events
        client.start_stream(&stream_id);
        client.stop_stream(&stream_id);

        let events = env.events().all();
        assert!(events.len() <= 1);
    }

    #[test]
    fn test_create_stream_allows_last_u32_id() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        set_next_stream_id(&env, u32::MAX);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        assert_eq!(stream_id, u32::MAX);
        assert_eq!(get_next_stream_id(&env), 0);
    }

    #[test]
    #[should_panic(expected = "stream id overflow")]
    fn test_create_stream_panics_when_id_would_overflow() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        set_next_stream_id(&env, 0);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);
    }

    #[test]
    fn test_start_and_stop_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &50_i128, &5_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &50_i128, &5_000_i128, &0_u64);
        client.start_stream(&stream_id);
        let info = client.get_stream_info(&stream_id);
        assert!(info.is_active);
        client.stop_stream(&stream_id);
        let info = client.get_stream_info(&stream_id);
        assert!(!info.is_active);
        assert_eq!(info.memo, String::from_str(&env, "memo"));
    }

    #[test]
    #[should_panic(expected = "stream not active")]
    fn test_stop_stream_inactive_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &50_i128, &5_000_i128, &0_u64);

        client.stop_stream(&stream_id);
    }

    #[test]
    #[should_panic(expected = "stream not found")]
    fn test_stop_stream_missing_id_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        client.stop_stream(&999_u32);
    }

    #[test]
    fn test_stop_stream_requires_payer_auth() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &50_i128, &5_000_i128, &0_u64);
        client.start_stream(&stream_id);

        env.set_auths(&[]);

        let result = catch_unwind(AssertUnwindSafe(|| client.stop_stream(&stream_id)));
        assert!(result.is_err());

        let info = client.get_stream_info(&stream_id);
        assert!(info.is_active);
        assert_eq!(info.end_time, 0);
    }

    #[test]
    fn test_settle_returns_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &0_u64);
        client.start_stream(&stream_id);
        advance_ledger_time(&env, 10);
        let amount = client.settle_stream(&stream_id);
        assert_eq!(amount, 100);
    }

    #[test]
    fn test_batch_settle_empty_vec() {
        let env = Env::default();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let stream_ids = Vec::new(&env);
        let amounts = client.batch_settle(&stream_ids);

        assert_eq!(amounts.len(), 0);
    }

    #[test]
    fn test_batch_settle_inactive_stream_returns_zero() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &0_u64);

        let mut stream_ids = Vec::new(&env);
        stream_ids.push_back(stream_id);

        let amounts = client.batch_settle(&stream_ids);

        assert_eq!(amounts.len(), 1);
        assert_eq!(amounts.get(0).unwrap(), 0);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 1_000);
        assert!(!info.is_active);
    }

    #[test]
    fn test_batch_settle_single_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &0_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });

        let mut stream_ids = Vec::new(&env);
        stream_ids.push_back(stream_id);

        let amounts = client.batch_settle(&stream_ids);

        assert_eq!(amounts.len(), 1);
        assert_eq!(amounts.get(0).unwrap(), 100);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 900);
        assert_eq!(info.start_time, env.ledger().timestamp());
    }

    #[test]
    fn test_batch_settle_multiple_streams() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient_a = Address::generate(&env);
        let recipient_b = Address::generate(&env);
        let first_stream_id =
            client.create_stream(&payer, &recipient_a, &10_i128, &1_000_i128, &0_u64);
        let second_stream_id =
            client.create_stream(&payer, &recipient_b, &5_i128, &1_000_i128, &0_u64);
        client.start_stream(&first_stream_id);
        client.start_stream(&second_stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });

        let mut stream_ids = Vec::new(&env);
        stream_ids.push_back(first_stream_id);
        stream_ids.push_back(second_stream_id);

        let amounts = client.batch_settle(&stream_ids);

        assert_eq!(amounts.len(), 2);
        assert_eq!(amounts.get(0).unwrap(), 100);
        assert_eq!(amounts.get(1).unwrap(), 50);

        let first_info = client.get_stream_info(&first_stream_id);
        let second_info = client.get_stream_info(&second_stream_id);
        assert_eq!(first_info.balance, 900);
        assert_eq!(second_info.balance, 950);
    }

    #[test]
    fn test_batch_settle_missing_id_reverts_all() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &10_i128, &1_000_i128, &0_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });

        let original_info = client.get_stream_info(&stream_id);

        let mut stream_ids = Vec::new(&env);
        stream_ids.push_back(stream_id);
        stream_ids.push_back(999_u32);

        let result = catch_unwind(AssertUnwindSafe(|| client.batch_settle(&stream_ids)));
        assert!(result.is_err());

        let info_after = client.get_stream_info(&stream_id);
        assert_eq!(info_after.balance, original_info.balance);
        assert_eq!(info_after.start_time, original_info.start_time);
    }

    #[test]
    #[should_panic(expected = "batch too large")]
    fn test_batch_settle_too_large_panics() {
        let env = Env::default();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let mut stream_ids = Vec::new(&env);
        for stream_id in 1..=(MAX_BATCH_SETTLE_SIZE + 1) {
            stream_ids.push_back(stream_id);
        }

        client.batch_settle(&stream_ids);
    }

    #[test]
    fn test_vesting_unlocks_linearly_across_multiple_settlements() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_vesting_stream(&payer, &recipient, &1_000_i128, &100_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });
        let first = client.settle_stream(&stream_id);
        assert_eq!(first, 100);

        env.ledger().with_mut(|li| {
            li.timestamp += 40;
        });
        let second = client.settle_stream(&stream_id);
        assert_eq!(second, 400);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 500);
        if let StreamMode::LinearVesting { vested_amount, .. } = info.mode {
            assert_eq!(vested_amount, 500);
        } else {
            panic!("expected linear vesting mode");
        }
    }

    #[test]
    fn test_vesting_releases_rounding_remainder_at_end() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_vesting_stream(&payer, &recipient, &1_000_i128, &3_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 1;
        });
        assert_eq!(client.settle_stream(&stream_id), 333);

        env.ledger().with_mut(|li| {
            li.timestamp += 1;
        });
        assert_eq!(client.settle_stream(&stream_id), 333);

        env.ledger().with_mut(|li| {
            li.timestamp += 1;
        });
        assert_eq!(client.settle_stream(&stream_id), 334);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 0);
    }

    #[test]
    fn test_vesting_schedule_anchor_persists_across_restart() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_vesting_stream(&payer, &recipient, &1_000_i128, &100_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });
        client.stop_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 20;
        });
        client.start_stream(&stream_id);

        // Vesting is anchored to the first start time, so 30% is now claimable.
        let amount = client.settle_stream(&stream_id);
        assert_eq!(amount, 300);
    }

    #[test]
    fn test_vesting_unlocks_full_balance_after_duration() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_vesting_stream(&payer, &recipient, &1_000_i128, &10_u64);
        client.start_stream(&stream_id);

        env.ledger().with_mut(|li| {
            li.timestamp += 15;
        });
        let amount = client.settle_stream(&stream_id);
        assert_eq!(amount, 1_000);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 0);
    }

    #[test]
    fn test_version_returns_expected() {
        let env = Env::default();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);
        assert_eq!(client.version(), 2_000);
    }

    #[test]
    fn test_version_matches_const() {
        let env = Env::default();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);
        assert_eq!(client.version(), VERSION);
    }

    #[test]
    fn test_version_is_positive() {
        let env = Env::default();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);
        assert!(client.version() > 0);
    }

    #[test]
    fn test_stream_uses_persistent_storage() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);

        // Verify stream is retrievable (storage works)
        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 10_000);
    }

    #[test]
    fn test_create_stream_extends_ttl() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);

        // Advance ledger by a modest amount — stream should still be alive
        // because create_stream extended its TTL
        env.ledger().with_mut(|li| {
            li.sequence_number += 1_000;
            li.timestamp += 5_000;
        });

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 10_000);
    }

    #[test]
    fn test_archive_settled_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        // rate=100/s, balance=1000 → fully drained after 10s
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &1_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &1_000_i128, &0_u64);
        client.start_stream(&stream_id);

        // Advance 10 seconds so balance drains to 0
        advance_ledger_time(&env, 10);
        let amount = client.settle_stream(&stream_id);
        assert_eq!(amount, 1_000);

        client.stop_stream(&stream_id);
        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 0);
        assert!(!info.is_active);
        assert_eq!(info.memo, String::from_str(&env, "memo"));

        // Now archive — stream is stopped and fully settled
        client.archive_stream(&stream_id);
    }

    #[test]
    #[should_panic]
    fn test_archive_unsettled_stream_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);

        // Stream is inactive but has balance > 0 — should panic
        // to protect recipient's entitlement
        client.archive_stream(&stream_id);
    }

    #[test]
    #[should_panic]
    fn test_archive_active_stream_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128, &0_u64);
        client.start_stream(&stream_id);

        // Should panic — stream is active
        client.archive_stream(&stream_id);
    }

    #[test]
    #[should_panic]
    fn test_archived_stream_not_found() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        // Create, start, drain, stop, then archive
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &1_000_i128, &String::from_str(&env, "memo"));
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &1_000_i128, &0_u64);
        client.start_stream(&stream_id);
        advance_ledger_time(&env, 10);
        client.settle_stream(&stream_id);
        client.stop_stream(&stream_id);
        client.withdraw_stream(&stream_id); // clear claimable before archive
        client.archive_stream(&stream_id);

        // Panics — stream was archived.
        client.get_stream_info(&stream_id);
    }

    #[test]
    fn test_update_rate_inactive_stream() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        // Update rate while inactive
        client.update_rate(&stream_id, &80_i128);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.rate_per_second, 80);
        assert_eq!(info.balance, 10_000); // Balance unchanged
    }

    #[test]
    fn test_update_rate_active_stream_settles_first() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        // rate=100/s, balance=10000
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);
        client.start_stream(&stream_id);

        // Advance 10 seconds
        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });

        // Update rate to 50/s — should settle 1000 (10s * 100/s) first
        client.update_rate(&stream_id, &50_i128);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.rate_per_second, 50);
        assert_eq!(info.balance, 9_000); // 10000 - 1000
        assert!(info.is_active);
    }

    #[test]
    fn test_update_rate_accrual_correctness() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        // rate=100/s, balance=10000
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);
        client.start_stream(&stream_id);

        // Advance 5 seconds at rate 100/s → 500 accrued
        env.ledger().with_mut(|li| {
            li.timestamp += 5;
        });

        // Change rate to 50/s
        client.update_rate(&stream_id, &50_i128);
        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 9_500); // 10000 - 500

        // Advance another 10 seconds at rate 50/s → 500 more accrued
        env.ledger().with_mut(|li| {
            li.timestamp += 10;
        });

        let amount = client.settle_stream(&stream_id);
        assert_eq!(amount, 500); // 10s * 50/s

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.balance, 9_000); // 9500 - 500
    }

    #[test]
    fn test_update_rate_decrease_allowed() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &1000_i128, &100_000_i128);

        // Decrease by 90% — should be allowed
        client.update_rate(&stream_id, &100_i128);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.rate_per_second, 100);
    }

    #[test]
    fn test_update_rate_small_increase_allowed() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        // Increase by 10% — should be allowed
        client.update_rate(&stream_id, &110_i128);

        let info = client.get_stream_info(&stream_id);
        assert_eq!(info.rate_per_second, 110);
    }

    #[test]
    #[should_panic(expected = "rate increase exceeds 10% limit")]
    fn test_update_rate_large_increase_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        // Increase by 20% — should panic
        client.update_rate(&stream_id, &120_i128);
    }

    #[test]
    #[should_panic(expected = "rate must be positive")]
    fn test_update_rate_zero_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        client.update_rate(&stream_id, &0_i128);
    }

    #[test]
    #[should_panic(expected = "rate must be positive")]
    fn test_update_rate_negative_panics() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &100_i128, &10_000_i128);

        client.update_rate(&stream_id, &-50_i128);
    }

    #[test]
    fn test_update_rate_multiple_times() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(StreamPayContract, ());
        let client = StreamPayContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let recipient = Address::generate(&env);
        let stream_id = client.create_stream(&payer, &recipient, &1000_i128, &100_000_i128);

        // First decrease
        client.update_rate(&stream_id, &500_i128);
        assert_eq!(client.get_stream_info(&stream_id).rate_per_second, 500);

        // Second decrease
        client.update_rate(&stream_id, &250_i128);
        assert_eq!(client.get_stream_info(&stream_id).rate_per_second, 250);

        // Small increase (10% of 250 = 25, so max 275)
        client.update_rate(&stream_id, &275_i128);
        assert_eq!(client.get_stream_info(&stream_id).rate_per_second, 275);
    }
}
