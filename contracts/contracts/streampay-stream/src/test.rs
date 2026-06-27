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

// ── Focused tests for every documented error condition ────────────────────────

/// `initialize` called twice must return `Error::InvalidState`.
#[test]
fn initialize_twice_returns_invalid_state() {
    let data = setup();

    data.client.initialize(&data.admin);

    assert_contract_error!(
        data.client.try_initialize(&data.admin),
        Error::InvalidState
    );
}

/// `set_paused` with a non-admin caller must return `Error::Unauthorized`.
#[test]
fn set_paused_wrong_admin_returns_unauthorized() {
    let data = setup();
    let wrong = Address::generate(&data.env);

    data.client.initialize(&data.admin);

    assert_contract_error!(
        data.client.try_set_paused(&wrong, &true),
        Error::Unauthorized
    );
}

/// `set_token_allowed` with a non-admin caller must return `Error::Unauthorized`.
#[test]
fn set_token_allowed_wrong_admin_returns_unauthorized() {
    let data = setup();
    let wrong = Address::generate(&data.env);

    data.client.initialize(&data.admin);

    assert_contract_error!(
        data.client
            .try_set_token_allowed(&wrong, &data.token, &false),
        Error::Unauthorized
    );
}

/// `start_stream` on a non-existent ID must return `Error::NotFound`.
#[test]
fn start_stream_missing_returns_not_found() {
    let data = setup();

    assert_contract_error!(
        data.client.try_start_stream(&9999),
        Error::NotFound
    );
}

/// `start_stream` on a contract that is paused must return `Error::ContractPaused`.
#[test]
fn start_stream_paused_returns_contract_paused() {
    let data = setup();

    data.client.initialize(&data.admin);

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &true,
    );

    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(
        data.client.try_start_stream(&stream_id),
        Error::ContractPaused
    );
}

/// `withdraw` on a missing stream must return `Error::NotFound`.
#[test]
fn withdraw_missing_stream_returns_not_found() {
    let data = setup();

    assert_contract_error!(
        data.client.try_withdraw(&9999, &1),
        Error::NotFound
    );
}

/// `withdraw` on a `Draft` stream must return `Error::InvalidState`.
#[test]
fn withdraw_on_draft_stream_returns_invalid_state() {
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

    assert_contract_error!(
        data.client.try_withdraw(&stream_id, &1),
        Error::InvalidState
    );
}

/// `withdraw` with `amount == 0` must return `Error::InvalidAmount`.
#[test]
fn withdraw_zero_returns_invalid_amount() {
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

    assert_contract_error!(
        data.client.try_withdraw(&stream_id, &0),
        Error::InvalidAmount
    );
}

/// `withdrawable` on a missing stream must return `Error::NotFound`.
#[test]
fn withdrawable_missing_stream_returns_not_found() {
    let data = setup();

    assert_contract_error!(
        data.client.try_withdrawable(&9999),
        Error::NotFound
    );
}
