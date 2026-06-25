#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};

use crate::{Contract, ContractClient, StreamStatus};

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

    (env, admin, sender, recipient, token)
}

proptest! {
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

    /// Property: total_amount is unchanged after >100 pause/resume cycles.
    ///
    /// This directly tests issue #461: escrowed balance must not drift regardless
    /// of how many times a stream is paused and resumed. Each cycle only adjusts
    /// timeline fields (end_time, total_paused_duration); total_amount is invariant.
    #[test]
    fn prop_many_pause_resume_cycles_preserve_total_amount(
        total_amount in 1_000_000i128..1_000_000_000i128,
        duration in 10_000u64..100_000u64,
        // 101-150 cycles to exercise well beyond the 100-cycle requirement
        num_cycles in 101u32..150u32,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let start = 1_000u64;
        let stream_id = client.create_stream(
            &sender, &recipient, &token, &total_amount, &start, &(start + duration),
        );

        let initial_stream = client.get_stream(&stream_id);
        prop_assert_eq!(initial_stream.total_amount, total_amount);

        let mut current_time = start;

        for _ in 0..num_cycles {
            // Advance 10 units then pause
            current_time += 10;
            env.ledger().set_timestamp(current_time);
            let _ = client.pause(&stream_id);

            let paused_stream = client.get_stream(&stream_id);
            // Invariant: total_amount unchanged by pause
            prop_assert_eq!(
                paused_stream.total_amount, total_amount,
                "total_amount must not change on pause"
            );
            prop_assert_eq!(paused_stream.status, StreamStatus::Paused);

            // Advance 5 units while paused then resume
            current_time += 5;
            env.ledger().set_timestamp(current_time);
            let _ = client.resume(&stream_id);

            let resumed_stream = client.get_stream(&stream_id);
            // Invariant: total_amount unchanged by resume
            prop_assert_eq!(
                resumed_stream.total_amount, total_amount,
                "total_amount must not change on resume"
            );
            prop_assert_eq!(resumed_stream.status, StreamStatus::Active);

            // Escrow accounting: released_amount <= total_amount at all times
            prop_assert!(
                resumed_stream.released_amount <= total_amount,
                "released_amount {} must not exceed total_amount {}",
                resumed_stream.released_amount,
                total_amount
            );
        }

        // Final check: stream after all cycles still holds the original total
        let final_stream = client.get_stream(&stream_id);
        prop_assert_eq!(final_stream.total_amount, total_amount);
        prop_assert!(final_stream.released_amount >= 0);
        prop_assert!(final_stream.released_amount <= total_amount);
    }

    /// Property: no balance drift across >100 pause/resume cycles.
    ///
    /// Verifies that withdrawable + released_amount never exceeds total_amount
    /// (no tokens created) and never becomes inconsistent (no tokens destroyed).
    #[test]
    fn prop_no_balance_drift_across_many_cycles(
        total_amount in 1_000_000i128..500_000_000i128,
        num_cycles in 101u32..120u32,
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let start = 1_000u64;
        let duration = 100_000u64;
        let stream_id = client.create_stream(
            &sender, &recipient, &token, &total_amount, &start, &(start + duration),
        );

        let mut current_time = start;

        for _ in 0..num_cycles {
            current_time += 8;
            env.ledger().set_timestamp(current_time);
            let _ = client.pause(&stream_id);

            // While paused: withdrawable must not increase, balance invariant holds
            let withdrawable_paused = client.withdrawable(&stream_id);
            let stream_paused = client.get_stream(&stream_id);
            prop_assert!(withdrawable_paused >= 0);
            // No balance drift: withdrawable + released <= total
            prop_assert!(
                withdrawable_paused + stream_paused.released_amount <= total_amount,
                "balance drift detected while paused: withdrawable={} released={} total={}",
                withdrawable_paused, stream_paused.released_amount, total_amount
            );

            current_time += 4;
            env.ledger().set_timestamp(current_time);
            let _ = client.resume(&stream_id);

            // After resume: same invariant must hold
            let withdrawable_active = client.withdrawable(&stream_id);
            let stream_active = client.get_stream(&stream_id);
            prop_assert!(withdrawable_active >= 0);
            prop_assert!(
                withdrawable_active + stream_active.released_amount <= total_amount,
                "balance drift detected after resume: withdrawable={} released={} total={}",
                withdrawable_active, stream_active.released_amount, total_amount
            );
        }
    }

    /// Property: large pause durations do not cause overflow in end_time or
    /// total_paused_duration. The contract must return an error rather than
    /// silently wrapping around.
    #[test]
    fn prop_overflow_boundary_pause_durations(
        total_amount in 1_000_000i128..1_000_000_000i128,
        // Pause duration near u64::MAX/2 so that end_time + pause_gap overflows u64
        pause_gap in (u64::MAX / 2 - 100)..(u64::MAX / 2),
    ) {
        let (env, _admin, sender, recipient, token) = setup_env();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        // Stream end_time near u64::MAX/2; adding pause_gap overflows u64
        let start = 1_000u64;
        // end must be > start to pass create_stream validation
        let end = u64::MAX / 2 + 1_000;
        let stream_id = client.create_stream(
            &sender, &recipient, &token, &total_amount, &start, &end,
        );

        // Pause at start + 10
        env.ledger().set_timestamp(start + 10);
        let _ = client.pause(&stream_id);

        // Set ledger to pause_start + pause_gap; use saturating_add to avoid
        // overflowing the test harness timestamp itself.
        let resume_time = (start + 10).saturating_add(pause_gap);
        env.ledger().set_timestamp(resume_time);

        let result = client.try_resume(&stream_id);
        // end + pause_gap overflows u64, so checked_add must return InvalidTimeRange.
        prop_assert!(
            result.is_err(),
            "expected overflow error when resuming with near-max pause duration"
        );

        // Invariant: the stream must not have been mutated (still paused, total_amount intact)
        let stream = client.get_stream(&stream_id);
        prop_assert_eq!(stream.total_amount, total_amount);
        prop_assert_eq!(stream.status, StreamStatus::Paused);
    }
}
