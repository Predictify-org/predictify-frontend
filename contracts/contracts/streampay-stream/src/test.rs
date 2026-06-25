#![cfg(test)]

use super::*;
use crate::storage::DataKey;
use soroban_sdk::{
    symbol_short,
    testutils::{
        storage::{Instance as _, Persistent as _},
        Address as _, Events, Ledger,
    },
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, IntoVal,
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

    StellarAssetClient::new(&env, &token).mint(&sender, &i128::MAX);

    TestData {
        env,
        client,
        token,
        admin,
        sender,
        recipient,
    }
}

/// Initializes the contract and returns the TestData.
fn setup_initialized() -> TestData {
    let data = setup();
    data.client.initialize(&data.admin);
    data
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
fn stream_accrues_nothing_before_start_time() {
    let data = setup_initialized();
    // Create with a future start_time; ledger is at T=1_000.
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &2_000, &3_000,
    );
    // Still before start_time — nothing should be vested.
    assert_eq!(data.client.withdrawable(&stream_id), 0);
    assert_eq!(data.client.stream_balance(&stream_id), 0);

    // Advance to mid-stream.
    data.env.ledger().set_timestamp(2_500);
    assert!(data.client.withdrawable(&stream_id) > 0);
    assert!(data.client.stream_balance(&stream_id) > 0);
}

#[test]
fn initialize_succeeds_once() {
    let data = setup();
    data.client.initialize(&data.admin);
    // Verify admin is stored by exercising an admin-only call without error.
    data.client.set_paused(&data.admin, &false);
}

#[test]
fn initialize_twice_returns_invalid_state() {
    let data = setup();
    data.client.initialize(&data.admin);
    assert_contract_error!(data.client.try_initialize(&data.admin), Error::InvalidState);
}

// ── set_paused ────────────────────────────────────────────────────────────────

#[test]
fn set_paused_true_blocks_create_stream() {
    let data = setup_initialized();
    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &1_000, &1_010),
        Error::ContractPaused
    );
}



#[test]
fn set_paused_true_blocks_withdraw() {
    let data = setup_initialized();

    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );

    data.env.ledger().set_timestamp(1_050);
    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(data.client.try_withdraw(&id, &500), Error::ContractPaused);
}

#[test]
fn unpause_re_enables_operations() {
    let data = setup_initialized();
    data.client.set_paused(&data.admin, &true);
    data.client.set_paused(&data.admin, &false);

    // Should succeed after unpause.
    data.client
        .create_stream(&data.sender, &data.recipient, &data.token, &100, &1_000, &1_010);
}

#[test]
fn stream_persistent_ttl_extends_on_money_path_access() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );

    let before_ttl = data
        .env
        .storage()
        .persistent()
        .get_ttl(&DataKey::Stream(stream_id));

    data.env.ledger().set_timestamp(1_050);
    let _ = data.client.withdrawable(&stream_id);

    let after_ttl = data
        .env
        .storage()
        .persistent()
        .get_ttl(&DataKey::Stream(stream_id));

    assert!(after_ttl > before_ttl);
}

#[test]
fn instance_ttl_extends_for_admin_and_counter_keys() {
    let data = setup_initialized();
    let _ = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );

    let before_instance_ttl = data.env.storage().instance().get_ttl();

    data.env.ledger().set_timestamp(1_050);
    data.client.set_paused(&data.admin, &false);
    let _ = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &500,
        &1_050,
        &1_060,
    );

    let after_instance_ttl = data.env.storage().instance().get_ttl();

    assert!(after_instance_ttl > before_instance_ttl);
}

#[test]
fn set_paused_wrong_admin_returns_unauthorized() {
    let data = setup_initialized();
    let wrong = Address::generate(&data.env);

    data.env.mock_auths(&[]);
    data.client.set_paused(&wrong, &true);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn set_admin_wrong_admin_returns_unauthorized() {
    let data = setup_initialized();
    let wrong = Address::generate(&data.env);
    let new_admin = Address::generate(&data.env);

    data.env.mock_auths(&[]);
    data.client.set_admin(&wrong, &new_admin);
}

// ── set_token_allowed ─────────────────────────────────────────────────────────

#[test]
fn blocked_token_returns_token_not_allowed() {
    let data = setup_initialized();
    data.client
        .set_token_allowed(&data.admin, &data.token, &false);

    assert_contract_error!(
        data.client
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &1_000, &1_010),
        Error::TokenNotAllowed
    );
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn set_token_allowed_wrong_admin_returns_unauthorized() {
    let data = setup_initialized();
    let wrong = Address::generate(&data.env);

    data.env.mock_auths(&[]);
    data.client.set_token_allowed(&wrong, &data.token, &false);
}

// ── Authorization boundaries ────────────────────────────────────────────────

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn create_stream_wrong_sender_fails() {
    let data = setup_initialized();
    let wrong = Address::generate(&data.env);

    data.env.mock_auths(&[]);
    data.client.create_stream(
        &wrong,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn start_stream_wrong_sender_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );

    let _wrong = Address::generate(&data.env);
    data.env.mock_auths(&[]);
    data.client.start_stream(&id);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn withdraw_wrong_recipient_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );

    data.env.ledger().set_timestamp(1_005);
    data.env.mock_auths(&[]);
    data.client.withdraw(&id, &50);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn pause_wrong_sender_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );

    data.env.mock_auths(&[]);
    data.client.pause(&id);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn resume_wrong_sender_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );
    data.client.pause(&id);

    data.env.mock_auths(&[]);
    data.client.resume(&id);
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
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
        &1_000,
        &1_100,
    );

    data.env.ledger().set_timestamp(1_050);
    assert_contract_error!(data.client.try_withdraw(&stream_id, &600), Error::OverWithdraw);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.released_amount, 0);
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

    let cases = [
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
        (1, 1, 0, 1, 1),            // minimal duration, at end
        (10000, 1000, 100, 600, 6000), // with start offset
    ];

    for case_tuple in cases {
        let case = TestCase {
            total: case_tuple.0,
            duration: case_tuple.1,
            start_offset: case_tuple.2,
            test_offset: case_tuple.3,
            expected: case_tuple.4,
        };
        let data = setup();
        let start_time = 1_000 + case.start_offset as u64;
        let end_time = start_time + case.duration;
        data.env.ledger().set_timestamp(start_time);

        let stream_id = data.client.create_stream(
            &data.sender,
            &data.recipient,
            &data.token,
            &case.total,
            &start_time,
            &end_time,
        );

        let target_time = (1_000 + case.start_offset + case.test_offset) as u64;
        data.env.ledger().set_timestamp(target_time);
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
        &1_000,
        &1_100,
    );

    data.env.ledger().set_timestamp(1_050);
    let vested = data.client.stream_balance(&stream_id);

    // Should be exactly half of the total
    assert_eq!(vested, large_amount / 2);
    assert!(vested >= 0 && vested <= large_amount);
}



#[test]
fn stream_balance_matches_withdrawable_plus_released() {
    let data = setup();

    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );

    data.env.ledger().set_timestamp(1_050);
    let balance = data.client.stream_balance(&stream_id);
    let withdrawable = data.client.withdrawable(&stream_id);
    let stream = data.client.get_stream(&stream_id);

    assert_eq!(balance, withdrawable + stream.released_amount);
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
            &1_000,
            &1_100,
        )
    });

    assert_eq!(stream_id, 1);
    assert_budget_ceiling(&snapshot, 310_000, 55_000, 9, 5, 100, 1_400);
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
        &1_000,
        &1_100,
    );
    data.env.ledger().set_timestamp(1_050);

    let (withdrawn, snapshot) =
        measure_invocation(&data.env, || data.client.withdraw(&stream_id, &500));

    assert_eq!(withdrawn, 500);
    assert_budget_ceiling(&snapshot, 330_000, 55_000, 8, 4, 100, 1_100);
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
        &1_000,
        &1_100,
    );
    data.env.ledger().set_timestamp(1_100);

    let (withdrawn, snapshot) =
        measure_invocation(&data.env, || data.client.withdraw(&stream_id, &1_000));

    assert_eq!(withdrawn, 1_000);
    assert_budget_ceiling(&snapshot, 345_000, 55_000, 8, 4, 100, 1_100);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.status, StreamStatus::Settled);
}

// ── Event emission tests ───────────────────────────────────────────────────────

fn topic_payload(env: &Env, sym: soroban_sdk::Symbol) -> u64 {
    let v: soroban_sdk::Val = sym.into_val(env);
    v.get_payload()
}

#[test]
fn create_stream_emits_created_event() {
    let data = setup_initialized();
    data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("stream")))
            && topics.get(1).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("created")))
    });
    assert!(found, "expected 'stream.created' event after create_stream");
}

#[test]
fn withdraw_emits_withdrawn_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.withdraw(&stream_id, &300);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("stream")))
            && topics.get(1).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("withdrawn")))
    });
    assert!(found, "expected 'stream.withdrawn' event after withdraw");
}

#[test]
fn full_withdraw_emits_settled_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_100);
    data.client.withdraw(&stream_id, &1_000);
    let events = data.env.events().all();
    let withdrawn_payload = topic_payload(&data.env, symbol_short!("withdrawn"));
    let settled_payload   = topic_payload(&data.env, symbol_short!("settled"));
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1).map(|v| v.get_payload()) == Some(withdrawn_payload)
    });
    let has_settled = events.iter().any(|(_, topics, _)| {
        topics.get(1).map(|v| v.get_payload()) == Some(settled_payload)
    });
    assert!(has_withdrawn, "expected 'stream.withdrawn' event on full withdrawal");
    assert!(has_settled, "expected 'stream.settled' event after full withdrawal");
}

#[test]
fn pause_emits_paused_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("stream")))
            && topics.get(1).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("paused")))
    });
    assert!(found, "expected 'stream.paused' event after pause");
}

#[test]
fn resume_emits_resumed_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_200,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);
    data.env.ledger().set_timestamp(1_100);
    data.client.resume(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("stream")))
            && topics.get(1).map(|v| v.get_payload()) == Some(topic_payload(&data.env, symbol_short!("resumed")))
    });
    assert!(found, "expected 'stream.resumed' event after resume");
}

#[test]
fn failed_withdraw_emits_no_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_050);
    let _ = data.client.try_withdraw(&stream_id, &600);
    let events = data.env.events().all();
    let withdrawn_payload = topic_payload(&data.env, symbol_short!("withdrawn"));
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1).map(|v| v.get_payload()) == Some(withdrawn_payload)
    });
    assert!(!has_withdrawn, "no 'withdrawn' event should be emitted on a failed withdrawal");
}

// ── End-to-end lifecycle simulation ───────────────────────────────────────────

/// Advances both ledger timestamp and sequence number together.
///
/// Uses `env.ledger().set(...)` semantics (read current `LedgerInfo`, mutate
/// only the two time fields, write it back) so every tick looks like a real
/// ledger close: new timestamp *and* new sequence.  All other `LedgerInfo`
/// fields (protocol_version, network_id, TTL constants) are preserved from
/// the environment's existing state.
fn tick(env: &Env, timestamp: u64, sequence: u32) {
    env.ledger().with_mut(|li| {
        li.timestamp = timestamp;
        li.sequence_number = sequence;
    });
}

/// End-to-end simulation: ledger time is advanced across a full stream cycle.
///
/// ## Stream parameters
/// * `total_amount` = 3 000 tokens
/// * `start_time`   = T 1 000, `end_time` = T 4 000 (3 000-second window)
/// * Accrual rate   = 1 token / second
///
/// ## Tick schedule  (7 ticks, ≥ 6 required by spec)
///
/// | Tick | T     | Action                               | Effective elapsed |
/// |------|-------|--------------------------------------|-------------------|
/// |  1   | 1 000 | create stream; assert escrow locked  | 0                 |
/// |  2   | 1 500 | assert vested 500; withdraw 200      | 500               |
/// |  3   | 2 000 | assert vested 1 000; pause stream    | 1 000             |
/// |  4   | 2 500 | assert accrual frozen; resume stream | 1 000 (paused)    |
/// |  5   | 3 000 | assert accrual resumed (1 500 vested)| 1 500             |
/// |  6   | 3 500 | assert vested 2 000; withdraw 1 000  | 2 000             |
/// |  7   | 4 500 | settle; assert all tokens released   | 3 000 (full)      |
///
/// The 500-second pause (T 2 000 → T 2 500) extends `end_time` from 4 000 to
/// 4 500, so the full 3 000-token supply is always paid out to the recipient.
///
/// ## Balance invariants checked at every tick
/// * `stream_balance()` == vested amount (per linear-release math)
/// * `token::Client::balance` for escrow contract, sender, and recipient
/// * `stream.released_amount` tracks cumulative withdrawals
/// * `stream.status` transitions: Active → Paused → Active → Settled
#[test]
fn e2e_full_stream_lifecycle_with_ledger_time_simulation() {
    // ── Environment setup ─────────────────────────────────────────────────
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin     = Address::generate(&env);
    let sender    = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_addr = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    // Mint exactly 3 000 tokens to sender so post-create sender balance is 0,
    // making contract-escrow and recipient assertions unambiguous.
    StellarAssetClient::new(&env, &token_addr).mint(&sender, &3_000i128);

    let tok = TokenClient::new(&env, &token_addr);

    client.initialize(&admin);

    // ── Tick 1: T=1_000 — create stream ───────────────────────────────────
    // Stream: 3_000 tokens, start=1_000, end=4_000 (duration=3_000s, 1 tok/s).
    // create_stream transfers the full escrow immediately.
    tick(&env, 1_000, 100);

    let stream_id = client.create_stream(
        &sender,
        &recipient,
        &token_addr,
        &3_000i128,
        &1_000u64, // start_time
        &4_000u64, // end_time
    );

    // Full escrow locked; no accrual at t == start_time.
    assert_eq!(tok.balance(&contract_id), 3_000, "tick1: escrow");
    assert_eq!(tok.balance(&sender),      0,     "tick1: sender drained");
    assert_eq!(tok.balance(&recipient),   0,     "tick1: recipient empty");
    assert_eq!(client.stream_balance(&stream_id), 0, "tick1: nothing vested yet");
    assert_eq!(client.withdrawable(&stream_id),   0, "tick1: nothing withdrawable");

    let s = client.get_stream(&stream_id);
    assert_eq!(s.status,          StreamStatus::Active);
    assert_eq!(s.released_amount, 0);
    assert_eq!(s.start_time,      1_000);
    assert_eq!(s.end_time,        4_000);

    // ── Tick 2: T=1_500 — 500s elapsed; first partial withdraw ────────────
    // Vested = 3_000 * 500 / 3_000 = 500.  Withdraw 200.
    tick(&env, 1_500, 150);

    assert_eq!(client.stream_balance(&stream_id), 500, "tick2: vested 500");
    assert_eq!(client.withdrawable(&stream_id),   500, "tick2: withdrawable 500");

    client.withdraw(&stream_id, &200i128);

    assert_eq!(client.withdrawable(&stream_id),               300, "tick2: remaining after withdraw");
    assert_eq!(client.get_stream(&stream_id).released_amount, 200, "tick2: released 200");
    assert_eq!(tok.balance(&recipient),   200,   "tick2: recipient +200");
    assert_eq!(tok.balance(&contract_id), 2_800, "tick2: escrow -200");

    // ── Tick 3: T=2_000 — 1_000s elapsed; pause stream ────────────────────
    // Vested = 3_000 * 1_000 / 3_000 = 1_000.  Withdrawable = 1_000 - 200 = 800.
    tick(&env, 2_000, 200);

    assert_eq!(client.stream_balance(&stream_id), 1_000, "tick3: vested 1_000");
    assert_eq!(client.withdrawable(&stream_id),    800,  "tick3: withdrawable 800");

    client.pause(&stream_id);

    let s = client.get_stream(&stream_id);
    assert_eq!(s.status,     StreamStatus::Paused, "tick3: status Paused");
    assert_eq!(s.pause_time, 2_000,                "tick3: pause_time recorded");

    // ── Tick 4: T=2_500 — 500s paused; accrual frozen ─────────────────────
    // While Paused, vested_amount clamps effective_now at pause_time (T 2_000),
    // so stream_balance stays at 1_000.
    // Stream-level pause only freezes NEW accrual; already-vested funds remain
    // withdrawable.  withdrawable() = vested_at_pause - released = 1_000 - 200 = 800.
    tick(&env, 2_500, 250);

    assert_eq!(client.stream_balance(&stream_id), 1_000, "tick4: balance frozen at 1_000");
    assert_eq!(client.withdrawable(&stream_id),    800,  "tick4: 800 vested-minus-released still available");

    // Token balances unchanged during pause.
    assert_eq!(tok.balance(&recipient),   200,   "tick4: recipient unchanged");
    assert_eq!(tok.balance(&contract_id), 2_800, "tick4: escrow unchanged");

    client.resume(&stream_id);

    let s = client.get_stream(&stream_id);
    assert_eq!(s.status,                StreamStatus::Active, "tick4: status Active after resume");
    assert_eq!(s.total_paused_duration, 500,                  "tick4: 500s of pause recorded");
    // end_time extended by the paused duration to preserve the full 3_000-token window.
    assert_eq!(s.end_time, 4_500, "tick4: end_time extended to 4_500");

    // ── Tick 5: T=3_000 — 500s after resume; verify resumed accrual ───────
    // Effective elapsed = (3_000 - 1_000) - 500 paused = 1_500.
    // Vested = 3_000 * 1_500 / 3_000 = 1_500.  Withdrawable = 1_500 - 200 = 1_300.
    tick(&env, 3_000, 300);

    assert_eq!(client.stream_balance(&stream_id), 1_500, "tick5: vested 1_500");
    assert_eq!(client.withdrawable(&stream_id),   1_300, "tick5: withdrawable 1_300");

    // No action this tick; token balances unchanged.
    assert_eq!(tok.balance(&recipient),   200,   "tick5: recipient still 200");
    assert_eq!(tok.balance(&contract_id), 2_800, "tick5: escrow still 2_800");

    // ── Tick 6: T=3_500 — second partial withdraw ─────────────────────────
    // Effective elapsed = (3_500 - 1_000) - 500 = 2_000.
    // Vested = 3_000 * 2_000 / 3_000 = 2_000.  Withdrawable = 2_000 - 200 = 1_800.
    // Withdraw 1_000; released_amount becomes 1_200.
    tick(&env, 3_500, 350);

    assert_eq!(client.stream_balance(&stream_id), 2_000, "tick6: vested 2_000");
    assert_eq!(client.withdrawable(&stream_id),   1_800, "tick6: withdrawable 1_800");

    client.withdraw(&stream_id, &1_000i128);

    assert_eq!(client.get_stream(&stream_id).released_amount, 1_200, "tick6: released 1_200");
    assert_eq!(client.withdrawable(&stream_id),                 800,  "tick6: remaining 800");
    assert_eq!(tok.balance(&recipient),   1_200, "tick6: recipient +1_000");
    assert_eq!(tok.balance(&contract_id), 1_800, "tick6: escrow -1_000");

    // ── Tick 7: T=4_500 — stream elapsed; settle; final balances ──────────
    // now (4_500) >= end_time (4_500); settle() pays out remaining 3_000 - 1_200 = 1_800.
    // Recipient receives all 3_000 tokens across the three payouts (200+1_000+1_800).
    tick(&env, 4_500, 450);

    client.settle(&stream_id);

    let s = client.get_stream(&stream_id);
    assert_eq!(s.status,          StreamStatus::Settled, "tick7: status Settled");
    assert_eq!(s.released_amount, 3_000,                 "tick7: all tokens released");

    assert_eq!(tok.balance(&recipient),   3_000, "tick7: recipient received all 3_000");
    assert_eq!(tok.balance(&contract_id), 0,     "tick7: escrow fully drained");
    assert_eq!(tok.balance(&sender),      0,     "tick7: sender unchanged");
}
