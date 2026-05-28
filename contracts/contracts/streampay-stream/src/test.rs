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

#[test]
fn pause_freezes_accrual_and_preserves_vested_funds() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    // Stream accrues 500 after 50 seconds
    data.env.ledger().set_timestamp(1_050);
    assert_eq!(data.client.withdrawable(&stream_id), 500);

    // Pause the stream
    let paused = data.client.pause(&stream_id);
    assert_eq!(paused.status, StreamStatus::Paused);
    assert_eq!(paused.pause_time, 1_050);
    assert_eq!(paused.released_amount, 0);

    // No accrual while paused - vested amount remains withdrawable
    data.env.ledger().set_timestamp(1_100);
    assert_eq!(data.client.withdrawable(&stream_id), 500);
}

#[test]
fn resume_extends_end_time_to_preserve_unstreamed_amount() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    // Stream accrues 500 after 50 seconds
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);

    // Pause for 30 seconds
    data.env.ledger().set_timestamp(1_080);

    // Resume the stream
    let resumed = data.client.resume(&stream_id);
    assert_eq!(resumed.status, StreamStatus::Active);
    assert_eq!(resumed.pause_time, 0);
    // End time should be extended by 30 seconds (paused duration)
    assert_eq!(resumed.end_time, 1_130); // Original 1_100 + 30

    // Accrual resumes from where it left off
    // 50 seconds active before pause, 30 seconds paused, 10 seconds active after resume
    // Total active: 60 seconds, but we only count 50 before pause + 10 after = 60
    // At timestamp 1_090: elapsed from start (1_000) = 90 seconds
    // Subtract paused duration (30) = 60 seconds active
    // Accrued: (1000 * 60) / 100 = 600
    // Withdrawable: 600 - 0 (no withdrawals yet) = 600
    data.env.ledger().set_timestamp(1_090);
    assert_eq!(data.client.withdrawable(&stream_id), 600);
}

#[test]
fn double_pause_is_rejected() {
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
    data.client.pause(&stream_id);

    assert_contract_error!(
        data.client.try_pause(&stream_id),
        Error::InvalidState
    );
}

#[test]
fn resume_without_pause_is_rejected() {
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
        data.client.try_resume(&stream_id),
        Error::InvalidState
    );
}

#[test]
fn pause_non_active_stream_is_rejected() {
    let data = setup();

    // Create a draft stream
    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &true,
    );

    assert_contract_error!(
        data.client.try_pause(&stream_id),
        Error::InvalidState
    );
}

#[test]
fn pause_then_withdraw() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    // Stream accrues 500 after 50 seconds
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);

    // Withdraw the vested amount while paused
    assert_eq!(data.client.withdraw(&stream_id, &500), 500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.released_amount, 500); // 500 withdrawn
    assert_eq!(stream.status, StreamStatus::Paused);
}

#[test]
fn pause_preserves_total_streamable_amount() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );

    // Stream accrues 500 after 50 seconds
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);

    // Pause for 30 seconds
    data.env.ledger().set_timestamp(1_080);
    data.client.resume(&stream_id);

    // Stream to the new end time (1_130)
    // At timestamp 1_130: elapsed from start (1_000) = 130 seconds
    // Subtract paused duration (30) = 100 seconds active
    // Accrued: (1000 * 100) / 100 = 1000
    // Withdrawable: 1000 - 0 = 1000
    data.env.ledger().set_timestamp(1_130);
    assert_eq!(data.client.withdrawable(&stream_id), 1000);

    // Total should still be 1_000
    data.client.withdraw(&stream_id, &1000);
    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Settled);
}
