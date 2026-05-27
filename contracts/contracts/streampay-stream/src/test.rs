#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env,
};

#[derive(Debug)]
struct BudgetSnapshot {
    cpu_instructions: u64,
    memory_bytes: u64,
    disk_read_entries: u32,
    memory_read_entries: u32,
    write_entries: u32,
    disk_read_bytes: u32,
    write_bytes: u32,
}

impl BudgetSnapshot {
    fn total_read_entries(&self) -> u32 {
        self.disk_read_entries + self.memory_read_entries
    }
}

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

fn measure_invocation<T>(env: &Env, invoke: impl FnOnce() -> T) -> (T, BudgetSnapshot) {
    let mut budget = env.cost_estimate().budget();
    budget.reset_unlimited();

    let result = invoke();

    let budget = env.cost_estimate().budget();
    let resources = env.cost_estimate().resources();
    let snapshot = BudgetSnapshot {
        cpu_instructions: budget.cpu_instruction_cost(),
        memory_bytes: budget.memory_bytes_cost(),
        disk_read_entries: resources.disk_read_entries,
        memory_read_entries: resources.memory_read_entries,
        write_entries: resources.write_entries,
        disk_read_bytes: resources.disk_read_bytes,
        write_bytes: resources.write_bytes,
    };

    (result, snapshot)
}

fn assert_budget_ceiling(
    snapshot: &BudgetSnapshot,
    max_cpu_instructions: u64,
    max_memory_bytes: u64,
    max_total_read_entries: u32,
    max_write_entries: u32,
    max_disk_read_bytes: u32,
    max_write_bytes: u32,
) {
    assert!(
        snapshot.cpu_instructions <= max_cpu_instructions,
        "cpu instructions {} exceeded ceiling {}: {:?}",
        snapshot.cpu_instructions,
        max_cpu_instructions,
        snapshot
    );
    assert!(
        snapshot.memory_bytes <= max_memory_bytes,
        "memory bytes {} exceeded ceiling {}: {:?}",
        snapshot.memory_bytes,
        max_memory_bytes,
        snapshot
    );
    assert!(
        snapshot.total_read_entries() <= max_total_read_entries,
        "read entries {} exceeded ceiling {}: {:?}",
        snapshot.total_read_entries(),
        max_total_read_entries,
        snapshot
    );
    assert!(
        snapshot.write_entries <= max_write_entries,
        "write entries {} exceeded ceiling {}: {:?}",
        snapshot.write_entries,
        max_write_entries,
        snapshot
    );
    assert!(
        snapshot.disk_read_bytes <= max_disk_read_bytes,
        "disk read bytes {} exceeded ceiling {}: {:?}",
        snapshot.disk_read_bytes,
        max_disk_read_bytes,
        snapshot
    );
    assert!(
        snapshot.write_bytes <= max_write_bytes,
        "write bytes {} exceeded ceiling {}: {:?}",
        snapshot.write_bytes,
        max_write_bytes,
        snapshot
    );
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
fn budget_create_stream_stays_within_ceiling() {
    let data = setup();
    data.client.initialize(&data.admin);

    let (stream_id, snapshot) = measure_invocation(&data.env, || {
        data.client.create_stream(
            &data.sender,
            &data.recipient,
            &data.token,
            &1_000,
            &100,
            &false,
        )
    });

    assert_eq!(stream_id, 1);
    assert_budget_ceiling(&snapshot, 270_000, 45_000, 9, 5, 100, 1_400);
}

#[test]
fn budget_withdraw_stays_within_ceiling() {
    let data = setup();
    data.client.initialize(&data.admin);

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );
    data.env.ledger().set_timestamp(1_050);

    let (withdrawn, snapshot) =
        measure_invocation(&data.env, || data.client.withdraw(&stream_id, &500));

    assert_eq!(withdrawn, 500);
    assert_budget_ceiling(&snapshot, 275_000, 45_000, 8, 4, 100, 1_100);
}

#[test]
fn budget_full_withdraw_settle_stays_within_ceiling() {
    let data = setup();
    data.client.initialize(&data.admin);

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
    );
    data.env.ledger().set_timestamp(1_100);

    let (withdrawn, snapshot) =
        measure_invocation(&data.env, || data.client.withdraw(&stream_id, &1_000));

    assert_eq!(withdrawn, 1_000);
    assert_budget_ceiling(&snapshot, 275_000, 45_000, 8, 4, 100, 1_100);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Settled);
}
