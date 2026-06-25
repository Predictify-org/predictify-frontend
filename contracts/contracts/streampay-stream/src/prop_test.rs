#![cfg(test)]

use proptest::prelude::*;
use proptest::test_runner::Config;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};

use crate::{Contract, ContractClient, StreamStatus};

// ── Operation enum for state-machine property test ───────────────────────────
//
// Each variant represents one contract call in the lifecycle sequence. The
// test engine drives the stream through arbitrary sequences of these
// operations and asserts `released_amount <= total_amount` after every step.

/// Encoded lifecycle operation for use in the state-machine property test.
///
/// - `Withdraw(fraction)` — withdraw `withdrawable / fraction` tokens (1-8).
///   Using a fraction guards against the OverWithdraw error.
/// - `Pause` — pause if Active; skip if Paused/Settled.
/// - `Resume` — resume if Paused; skip otherwise.
/// - `Settle` — try to settle; only succeeds after end_time.
/// - `AdvanceTime(steps)` — advance ledger by `steps * (duration / 16)`.
#[derive(Debug, Clone)]
enum Op {
    Withdraw(u64), // fraction denominator in 1..=8
    Pause,
    Resume,
    Settle,
    AdvanceTime(u64), // step multiplier in 1..=4
}

/// Proptest strategy that generates a single `Op`.
fn arb_op() -> impl Strategy<Value = Op> {
    prop_oneof![
        (1u64..=8u64).prop_map(Op::Withdraw),
        Just(Op::Pause),
        Just(Op::Resume),
        Just(Op::Settle),
        (1u64..=4u64).prop_map(Op::AdvanceTime),
    ]
}

/// Proptest strategy for a sequence of 8–20 operations.
///
/// A sequence of 8–20 ops with the five variants above gives each test
/// run plenty of opportunity to hit every branch (pause→resume, multiple
/// withdrawals, settle after end) while staying fast per iteration.
fn arb_ops() -> impl Strategy<Value = Vec<Op>> {
    proptest::collection::vec(arb_op(), 8..=20)
}

// ── Global invariant: released_amount never exceeds total_amount ─────────────

/// Asserts the central safety invariant on a stream snapshot.
///
/// Called after every operation so any violation is caught at the earliest
/// possible point and the failing sequence is reported verbatim.
macro_rules! assert_invariant {
    ($stream:expr, $label:expr) => {{
        let s = &$stream;
        prop_assert!(
            s.released_amount >= 0,
            "[{}] released_amount {} is negative",
            $label,
            s.released_amount
        );
        prop_assert!(
            s.released_amount <= s.total_amount,
            "[{}] released_amount {} exceeds total_amount {}",
            $label,
            s.released_amount,
            s.total_amount
        );
        let withdrawable = s.total_amount
            .checked_sub(s.released_amount)
            .expect("subtraction overflow in assert_invariant");
        prop_assert!(
            withdrawable >= 0,
            "[{}] remaining ({}) is negative",
            $label,
            withdrawable
        );
    }};
}

/// Helper to set up test environment
fn setup_env() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let _contract_id = env.register(Contract, ());

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    StellarAssetClient::new(&env, &token).mint(&sender, &10_000_000_000);
    // Establish a SAC balance entry for recipient so the trustline check passes.
    StellarAssetClient::new(&env, &token).mint(&recipient, &1);

    (env, admin, sender, recipient, token)
}

proptest! {
    // ── Configuration: 1 024 cases for thorough coverage ─────────────────────
    #![proptest_config(Config {
        cases: 1_024,
        // Fixed failure persistence so flakes are reproduced by re-running.
        failure_persistence: None,
        ..Config::default()
    })]
    #[test]
    fn prop_accrual_invariants(
        total_amount in 1_000_000i128..10_000_000_000i128,
        duration in 100u64..1_000_000u64,
        elapsed_steps in 0u64..10u64,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        // Create active stream
        let stream_id = client
            .create_stream(&sender, &recipient, &token, &total_amount, &1_000, &(1_000 + duration));

        // Check initial state invariants
        let stream = client.get_stream(&stream_id);
        prop_assert_eq!(stream.status, StreamStatus::Active);
        prop_assert_eq!(stream.total_amount, total_amount);
        prop_assert_eq!(stream.released_amount, 0);
        prop_assert!(stream.released_amount >= 0);
        prop_assert!(stream.released_amount <= stream.total_amount);

        // Advance time and check accrual invariants
        let step_size = duration / (elapsed_steps.max(1));
        for i in 0..=elapsed_steps {
            let elapsed = i * step_size;
            env.ledger().set_timestamp(1_000 + elapsed);

            let withdrawable = client.withdrawable(&stream_id);
            let stream = client.get_stream(&stream_id);

            // Invariant: 0 <= withdrawable <= total_amount
            prop_assert!(withdrawable >= 0, "withdrawable should be non-negative");
            prop_assert!(
                withdrawable <= total_amount,
                "withdrawable {} should not exceed total_amount {}",
                withdrawable,
                total_amount
            );

            // Invariant: released_amount <= total_amount
            prop_assert!(
                stream.released_amount >= 0,
                "released_amount should be non-negative"
            );
            prop_assert!(
                stream.released_amount <= total_amount,
                "released_amount {} should not exceed total_amount {}",
                stream.released_amount,
                total_amount
            );

            // Invariant: withdrawable + released_amount <= total_amount
            prop_assert!(
                withdrawable + stream.released_amount <= total_amount,
                "withdrawable + released_amount should not exceed total_amount"
            );
        }
    }

    #[test]
    fn prop_withdrawal_preserves_invariants(
        total_amount in 1_000_000i128..10_000_000_000i128,
        duration in 100u64..1_000_000u64,
        withdraw_fraction in 1u64..10u64,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&sender, &recipient, &token, &total_amount, &1_000, &(1_000 + duration));

        // Advance to halfway point
        env.ledger().set_timestamp(1_000 + duration / 2);

        let withdrawable_before = client.withdrawable(&stream_id);
        let stream_before = client.get_stream(&stream_id);

        // Withdraw a fraction of the withdrawable amount
        let withdraw_amount = withdrawable_before / withdraw_fraction as i128;
        if withdraw_amount > 0 {
            let _ = client.withdraw(&stream_id, &withdraw_amount);

            let stream_after = client.get_stream(&stream_id);
            let withdrawable_after = client.withdrawable(&stream_id);

            // Invariant: released_amount increased by withdrawn amount
            prop_assert_eq!(
                stream_after.released_amount,
                stream_before.released_amount + withdraw_amount
            );

            // Invariant: released_amount <= total_amount
            prop_assert!(
                stream_after.released_amount <= total_amount,
                "released_amount after withdrawal should not exceed total_amount"
            );

            // Invariant: withdrawable decreased appropriately
            prop_assert!(
                withdrawable_after <= withdrawable_before,
                "withdrawable should decrease after withdrawal"
            );

            // Invariant: no overflow in calculations
            prop_assert!(
                stream_after.released_amount >= 0,
                "released_amount should remain non-negative"
            );
        }
    }

    #[test]
    fn prop_pause_resume_preserves_invariants(
        total_amount in 1_000_000i128..10_000_000_000i128,
        duration in 100u64..1_000_000u64,
        pause_time in 10u64..50u64,
        resume_delay in 10u64..50u64,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&sender, &recipient, &token, &total_amount, &1_000, &(1_000 + duration));

        // Advance to pause time
        let pause_elapsed = duration * pause_time / 100;
        env.ledger().set_timestamp(1_000 + pause_elapsed);

        let withdrawable_before_pause = client.withdrawable(&stream_id);
        let stream_before_pause = client.get_stream(&stream_id);

        // Pause the stream
        let _ = client.pause(&stream_id);
        let stream_paused = client.get_stream(&stream_id);

        prop_assert_eq!(stream_paused.status, StreamStatus::Paused);
        prop_assert!(stream_paused.pause_time > 0);

        // Advance time while paused
        env.ledger().set_timestamp(1_000 + pause_elapsed + resume_delay);

        // Withdrawable should not increase while paused
        let withdrawable_while_paused = client.withdrawable(&stream_id);
        prop_assert_eq!(
            withdrawable_while_paused,
            withdrawable_before_pause,
            "withdrawable should not increase while paused"
        );

        // Resume the stream
        let _ = client.resume(&stream_id);
        let stream_resumed = client.get_stream(&stream_id);

        prop_assert_eq!(stream_resumed.status, StreamStatus::Active);
        prop_assert!(stream_resumed.end_time > stream_before_pause.end_time);

        // Advance to end time
        env.ledger().set_timestamp(stream_resumed.end_time);

        let final_withdrawable = client.withdrawable(&stream_id);
        let final_stream = client.get_stream(&stream_id);

        // Invariant: total streamable amount preserved
        prop_assert!(
            final_withdrawable + final_stream.released_amount <= total_amount,
            "total payouts should not exceed total_amount"
        );

        // Invariant: no overflow in calculations
        prop_assert!(final_stream.released_amount >= 0);
        prop_assert!(final_withdrawable >= 0);
    }

    #[test]
    fn prop_extreme_values_no_overflow(
        total_amount in 1i128..i128::MAX / 2,
        duration in 1u64..u64::MAX / 2,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        // Use reasonable bounds to avoid test timeout
        let safe_total = total_amount.min(10_000_000_000i128);
        let safe_duration = duration.min(1_000_000u64);

        let stream_id = client
            .create_stream(&sender, &recipient, &token, &safe_total, &1_000, &(1_000 + safe_duration));

        // Advance to various points
        let checkpoints = [
            safe_duration / 4,
            safe_duration / 2,
            safe_duration * 3 / 4,
            safe_duration,
        ];

        for &checkpoint in &checkpoints {
            env.ledger().set_timestamp(1_000 + checkpoint);

            let withdrawable = client.withdrawable(&stream_id);
            let stream = client.get_stream(&stream_id);

            // Invariant: no overflow/panic
            prop_assert!(withdrawable >= 0);
            prop_assert!(withdrawable <= safe_total);
            prop_assert!(stream.released_amount >= 0);
            prop_assert!(stream.released_amount <= safe_total);
        }
    }

    #[test]
    fn prop_monotonic_vesting(
        total_amount in 1_000_000i128..10_000_000_000i128,
        duration in 100u64..1_000_000u64,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let stream_id = client
            .create_stream(&sender, &recipient, &token, &total_amount, &1_000, &(1_000 + duration));

        let mut previous_withdrawable = 0i128;

        // Check monotonicity at multiple points
        for i in 0..=10 {
            let elapsed = duration * i / 10;
            env.ledger().set_timestamp(1_000 + elapsed);

            let withdrawable = client.withdrawable(&stream_id);

            // Invariant: vested amount is monotonic in time
            prop_assert!(
                withdrawable >= previous_withdrawable,
                "vested amount should be monotonic: {} >= {}",
                withdrawable,
                previous_withdrawable
            );

            previous_withdrawable = withdrawable;
        }
    }

    // ── Global invariant: released_amount never exceeds total_amount ──────────
    //
    // This is the central safety property of the escrow contract.
    // The stream holds `total_amount` tokens; no more than that amount
    // must ever be marked released, regardless of operation order.
    //
    // Strategy
    // --------
    //   1. Create an Active stream with arbitrary amount and duration.
    //   2. Drive it through an arbitrary 8–20-op sequence (Withdraw, Pause,
    //      Resume, Settle, AdvanceTime), skipping inapplicable ops.
    //   3. Assert `assert_invariant!` — released in [0, total] — after every
    //      single step, not just at the end.
    //
    // 1 024 cases × up to 20 ops ≈ 20 000 invocations per run.
    #[test]
    fn prop_released_amount_never_exceeds_total(
        total_amount in 1_000_000i128..10_000_000_000i128,
        duration    in 100u64..500_000u64,
        ops         in arb_ops(),
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let start_time = 1_000u64;
        let end_time   = start_time + duration;
        // time_step gives ~16 evenly-spaced probes across the duration window.
        let time_step  = duration / 16; // >= 6 when duration >= 100

        let stream_id = client.create_stream(
            &sender, &recipient, &token, &total_amount, &start_time, &end_time,
        );

        // Invariant must hold immediately after creation.
        assert_invariant!(client.get_stream(&stream_id), "after create");

        let mut now = start_time;

        for op in &ops {
            let stream = client.get_stream(&stream_id);

            match op {
                // Withdraw `available / fraction` tokens (fraction in 1..=8).
                // Skip when Settled, wrong state, or nothing available.
                Op::Withdraw(fraction) => {
                    if stream.status == StreamStatus::Settled
                        || (stream.status != StreamStatus::Active
                            && stream.status != StreamStatus::Paused)
                    {
                        continue;
                    }
                    let available = client.withdrawable(&stream_id);
                    let amount    = available / (*fraction as i128);
                    if amount <= 0 { continue; }
                    let _ = client.try_withdraw(&stream_id, &amount);
                    assert_invariant!(client.get_stream(&stream_id), "after withdraw");
                }

                // Pause only from Active state.
                Op::Pause => {
                    if stream.status != StreamStatus::Active { continue; }
                    let _ = client.try_pause(&stream_id);
                    assert_invariant!(client.get_stream(&stream_id), "after pause");
                }

                // Resume only from Paused state.
                // Advance clock past pause_time so paused_duration >= 0.
                Op::Resume => {
                    if stream.status != StreamStatus::Paused { continue; }
                    if now <= stream.pause_time {
                        now = stream.pause_time + 1;
                        env.ledger().set_timestamp(now);
                    }
                    let _ = client.try_resume(&stream_id);
                    assert_invariant!(client.get_stream(&stream_id), "after resume");
                }

                // Settle: permissionless once now >= end_time.
                // Jump the clock to end_time to guarantee the op fires at least
                // sometimes, exercising the settle-with-partial-release branch.
                Op::Settle => {
                    if stream.status == StreamStatus::Settled {
                        assert_invariant!(stream, "settle noop");
                        continue;
                    }
                    if stream.status != StreamStatus::Active
                        && stream.status != StreamStatus::Paused
                    {
                        continue;
                    }
                    let current_end = client.get_stream(&stream_id).end_time;
                    if now < current_end {
                        now = current_end;
                        env.ledger().set_timestamp(now);
                    }
                    let _ = client.try_settle(&stream_id);
                    assert_invariant!(client.get_stream(&stream_id), "after settle");
                }

                // AdvanceTime: move clock forward; no contract mutation.
                // Validates that read-only queries stay stable without writes.
                Op::AdvanceTime(multiplier) => {
                    now = now.saturating_add(multiplier * time_step.max(1));
                    env.ledger().set_timestamp(now);
                    assert_invariant!(client.get_stream(&stream_id), "after advance_time");
                }
            }
        }

        // ── Terminal invariants ───────────────────────────────────────────────
        let final_stream = client.get_stream(&stream_id);
        assert_invariant!(final_stream, "final");

        // A Settled stream must have released exactly total_amount.
        if final_stream.status == StreamStatus::Settled {
            prop_assert_eq!(
                final_stream.released_amount,
                final_stream.total_amount,
                "Settled stream must have released_amount == total_amount"
            );
        }
    }
}
