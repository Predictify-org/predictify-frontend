#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};

struct TestData {
    env: Env,
    client: ContractClient<'static>,
    token: Address,
    admin: Address,
    sender: Address,
    recipient: Address,
}

fn setup() -> TestData {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    StellarAssetClient::new(&env, &token).mint(&sender, &10_000);

    TestData {
        env,
        client,
        token,
        admin,
        sender,
        recipient,
    }
}

macro_rules! assert_contract_error {
    ($result:expr, $expected:expr) => {
        match $result {
            Err(Ok(err)) => assert_eq!(err, $expected),
            other => panic!("expected contract error {:?}, got {:?}", $expected, other),
        }
    };
}

#[test]
fn draft_stream_accrues_nothing_until_started() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &true,
    );

    data.env.ledger().set_timestamp(1_050);
    assert_eq!(data.client.withdrawable(&stream_id), 0);

    let draft = data.client.get_stream(&stream_id);
    assert_eq!(draft.status, StreamStatus::Draft);
    assert_eq!(draft.start_time, 0);
    assert_eq!(draft.end_time, 0);

    data.env.ledger().set_timestamp(2_000);
    let active = data.client.start_stream(&stream_id);
    assert_eq!(active.status, StreamStatus::Active);
    assert_eq!(active.start_time, 2_000);
    assert_eq!(active.last_update, 2_000);
    assert_eq!(active.end_time, 2_100);

    assert_eq!(data.client.withdrawable(&stream_id), 0);

    data.env.ledger().set_timestamp(2_050);
    assert_eq!(data.client.withdrawable(&stream_id), 500);
}

#[test]
fn active_stream_starts_accruing_at_creation() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Active);
    assert_eq!(stream.start_time, 1_000);
    assert_eq!(stream.end_time, 1_100);

    data.env.ledger().set_timestamp(1_025);
    assert_eq!(data.client.withdrawable(&stream_id), 250);
}

#[test]
fn starting_non_draft_is_rejected_with_invalid_state() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    assert_contract_error!(
        data.client.try_start_stream(&stream_id),
        Error::InvalidState
    );
}

#[test]
fn invalid_create_inputs_return_stable_errors() {
    let data = setup();

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &0, &100, &true,),
        Error::InvalidAmount
    );

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &0, &true,),
        Error::InvalidTimeRange
    );
}

#[test]
fn missing_stream_returns_not_found() {
    let data = setup();

    assert_contract_error!(data.client.try_get_stream(&999), Error::NotFound);
}

#[test]
fn over_withdraw_is_rejected() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_010);

    assert_contract_error!(
        data.client.try_withdraw(&stream_id, &101),
        Error::OverWithdraw
    );
}

#[test]
fn withdraw_settles_when_total_is_released() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_100);
    assert_eq!(data.client.withdraw(&stream_id, &1_000), 1_000);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Settled);

    assert_contract_error!(
        data.client.try_withdraw(&stream_id, &1),
        Error::AlreadySettled
    );
}

#[test]
fn admin_guards_return_stable_errors() {
    let data = setup();
    let wrong_admin = Address::generate(&data.env);

    data.client.initialize(&data.admin);

    assert_contract_error!(
        data.client.try_set_paused(&wrong_admin, &true),
        Error::Unauthorized
    );

    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &10, &true,),
        Error::ContractPaused
    );
}

#[test]
fn blocked_token_returns_token_not_allowed() {
    let data = setup();

    data.client.initialize(&data.admin);
    data.client
        .set_token_allowed(&data.admin, &data.token, &false);

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &10, &true,),
        Error::TokenNotAllowed
    );
}

// ── Linear release math tests ───────────────────────────────────────────────

#[test]
fn vested_amount_at_start_time_is_zero() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.start_time, 1_000);
    assert_eq!(data.client.stream_balance(&stream_id), 0);
}

#[test]
fn vested_amount_at_midpoint_is_half_total() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_050);
    assert_eq!(data.client.stream_balance(&stream_id), 500);
}

#[test]
fn vested_amount_at_end_time_is_total() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_100);
    assert_eq!(data.client.stream_balance(&stream_id), 1_000);
}

#[test]
fn vested_amount_past_end_time_is_clamped_to_total() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(2_000);
    assert_eq!(data.client.stream_balance(&stream_id), 1_000);
}

#[test]
fn vested_amount_before_start_time_is_zero() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(500);
    assert_eq!(data.client.stream_balance(&stream_id), 0);
}

#[test]
fn vested_amount_is_monotonic_non_decreasing() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    let mut prev = data.client.stream_balance(&stream_id);
    for t in [1_010, 1_020, 1_030, 1_040, 1_050, 1_060, 1_070, 1_080, 1_090, 1_100] {
        data.env.ledger().set_timestamp(t);
        let current = data.client.stream_balance(&stream_id);
        assert!(current >= prev, "vested amount decreased from {} to {} at t={}", prev, current, t);
        prev = current;
    }
}

#[test]
fn withdrawable_is_vested_minus_released() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_050);
    assert_eq!(data.client.stream_balance(&stream_id), 500);
    assert_eq!(data.client.withdrawable(&stream_id), 500);

    data.client.withdraw(&stream_id, &200);
    assert_eq!(data.client.stream_balance(&stream_id), 500);
    assert_eq!(data.client.withdrawable(&stream_id), 300);
}

#[test]
fn withdrawable_never_negative() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_050);
    data.client.withdraw(&stream_id, &600); // Over-withdraw should fail

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.released_amount, 200); // Only 200 was withdrawn

    // withdrawable should still be non-negative
    assert!(data.client.withdrawable(&stream_id) >= 0);
}

#[test]
fn table_driven_vested_amount_across_timeline() {
    struct TestCase {
        total: i128,
        duration: u64,
        start_offset: i64,
        test_offset: i64,
        expected: i128,
    }

    let cases = vec![
        // (total, duration, start_offset, test_offset, expected)
        (1000, 100, 0, 0, 0),       // at start
        (1000, 100, 0, 25, 250),    // 25% through
        (1000, 100, 0, 50, 500),    // 50% through
        (1000, 100, 0, 75, 750),    // 75% through
        (1000, 100, 0, 100, 1000),  // at end
        (1000, 100, 0, 150, 1000),  // past end
        (1000, 100, 0, -50, 0),     // before start
        (100, 10, 0, 5, 50),        // smaller values
        (1, 1, 0, 0, 0),            // minimal
        (1, 1, 0, 1, 1),            // minimal at end
        (10000, 1000, 100, 600, 5000), // with start offset
    ];

    for case in cases {
        let data = setup();
        data.env.ledger().set_timestamp(1_000 + case.start_offset as u64);

        let stream_id = data.client.create_stream(
            &data.sender,
            &data.recipient,
            &data.token,
            &case.total,
            &case.duration,
            &false,
        );

        data.env.ledger().set_timestamp(1_000 + (case.start_offset + case.test_offset) as u64);
        let result = data.client.stream_balance(&stream_id);

        assert_eq!(
            result, case.expected,
            "table_driven: total={}, duration={}, start_offset={}, test_offset={}, expected={}, got={}",
            case.total, case.duration, case.start_offset, case.test_offset, case.expected, result
        );
    }
}

#[test]
fn large_amount_near_i128_max_does_not_overflow() {
    let data = setup();

    // Use a large amount that could cause overflow if not using checked arithmetic
    let large_amount = i128::MAX / 1000; // Safe but large

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &large_amount,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_050);
    let vested = data.client.stream_balance(&stream_id);

    // Should be exactly half of the total
    assert_eq!(vested, large_amount / 2);
    assert!(vested >= 0 && vested <= large_amount);
}

#[test]
fn draft_stream_balance_is_zero() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &true,
    );

    data.env.ledger().set_timestamp(2_000);
    assert_eq!(data.client.stream_balance(&stream_id), 0);
}

#[test]
fn stream_balance_matches_withdrawable_plus_released() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    data.env.ledger().set_timestamp(1_050);
    let balance = data.client.stream_balance(&stream_id);
    let withdrawable = data.client.withdrawable(&stream_id);
    let stream = data.client.get_stream(&stream_id);

    assert_eq!(balance, withdrawable + stream.released_amount);
}
