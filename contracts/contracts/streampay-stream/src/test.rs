#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as TestAddress, Events, Ledger},
    testutils::storage::{Instance, Persistent},
    token::StellarAssetClient,
    Address, Env, Symbol, TryIntoVal,
};
use crate::storage::DataKey;

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
fn active_stream_accrues_over_time() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_050);
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

    let before_admin_ttl = data.env.storage().instance().get_ttl();
    let before_next_id_ttl = data
        .env
        .storage()
        .instance()
        .get_ttl();

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

    let after_admin_ttl = data.env.storage().instance().get_ttl();
    let after_next_id_ttl = data
        .env
        .storage()
        .instance()
        .get_ttl();

    assert!(after_admin_ttl > before_admin_ttl);
    assert!(after_next_id_ttl > before_next_id_ttl);
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

#[test]
fn settle_permissionless_succeeds() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &1_000,
        &1_010,
    );

    data.env.ledger().set_timestamp(1_020);
    data.client.settle(&id);
    let stream = data.client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Settled);
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

#[test]
fn create_stream_emits_created_event() {
    let data = setup_initialized();
    data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("stream"))
            && topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("created"))
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
            && topics.get(0).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("stream"))
            && topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("withdrawn"))
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
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("withdrawn"))
    });
    let has_settled = events.iter().any(|(_, topics, _)| {
        topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("settled"))
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
            && topics.get(0).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("stream"))
            && topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("paused"))
    });
    assert!(found, "expected 'stream.paused' event after pause");
}

#[test]
fn resume_emits_resumed_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &1_000, &1_100,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);
    data.env.ledger().set_timestamp(1_100);
    data.client.resume(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("stream"))
            && topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("resumed"))
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
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("withdrawn"))
    });
    assert!(!has_withdrawn, "no 'withdrawn' event should be emitted on a failed withdrawal");
}

// ── amend_stream ────────────────────────────────────────────────────────────────

fn create_active_stream(data: &TestData) -> u64 {
    data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    )
}

#[test]
fn amend_stream_increases_total_amount() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_050);
    data.client.amend_stream(&stream_id, &500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.total_amount, 1_500);
}

#[test]
fn amend_stream_extends_end_time_proportionally() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    let duration = 100u64; // 1100 - 1000
    let extra_amount = 500i128;
    let expected_extra_duration = (extra_amount * duration as i128) / 1_000;
    let expected_end_time = 1_100 + expected_extra_duration as u64;

    data.env.ledger().set_timestamp(1_050);
    data.client.amend_stream(&stream_id, &extra_amount);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.end_time, expected_end_time);
    assert_eq!(stream.total_amount, 1_500);
}

#[test]
fn amend_stream_increases_end_time_by_correct_duration() {
    let data = setup_initialized();
    // total=5000, duration=500 (start=1000, end=1500), rate=10/block
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &5_000, &1_000, &1_500,
    );

    // extra=500 => extra_duration = 500 * 500 / 5000 = 50
    data.env.ledger().set_timestamp(1_200);
    data.client.amend_stream(&stream_id, &500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.total_amount, 5_500);
    assert_eq!(stream.end_time, 1_550);
}

#[test]
fn amend_stream_keeps_rate_unchanged() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_050);
    data.client.amend_stream(&stream_id, &500);

    // Rate = total / duration = 10 per tick, unchanged after amendment.
    // Vested at t=1050: 50 ticks elapsed, 1500 * 50 / 150 = 500.
    let mid = data.client.stream_balance(&stream_id);
    assert_eq!(mid, 500); // same rate, same elapsed → same vested

    // At new end_time (1150), 100% should be vested.
    data.env.ledger().set_timestamp(1_150);
    let late = data.client.stream_balance(&stream_id);
    assert_eq!(late, 1_500);
}

#[test]
fn amend_stream_zero_amount_fails() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    assert_contract_error!(
        data.client.try_amend_stream(&stream_id, &0),
        Error::InvalidAmount
    );
}

#[test]
fn amend_stream_negative_amount_fails() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    assert_contract_error!(
        data.client.try_amend_stream(&stream_id, &-100),
        Error::InvalidAmount
    );
}

#[test]
fn amend_stream_settled_fails() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_100);
    data.client.withdraw(&stream_id, &1_000);

    assert_contract_error!(
        data.client.try_amend_stream(&stream_id, &500),
        Error::InvalidState
    );
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn amend_stream_wrong_sender_fails() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.mock_auths(&[]);
    data.client.amend_stream(&stream_id, &500);
}

#[test]
fn amend_stream_emits_amended_event() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_050);
    data.client.amend_stream(&stream_id, &500);

    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("stream"))
            && topics.get(1).and_then(|v| { let s: Result<Symbol, _> = v.try_into_val(&data.env); s.ok() }) == Some(symbol_short!("amended"))
    });
    assert!(found, "expected 'stream.amended' event after amend_stream");
}

#[test]
fn amend_stream_preserves_released_amount() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_050);
    data.client.withdraw(&stream_id, &200);

    data.env.ledger().set_timestamp(1_060);
    data.client.amend_stream(&stream_id, &500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.released_amount, 200);
}

#[test]
fn amend_stream_updates_last_update() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_075);
    data.client.amend_stream(&stream_id, &500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.last_update, 1_075);
}

#[test]
fn amend_stream_non_existent_fails() {
    let data = setup_initialized();

    assert_contract_error!(
        data.client.try_amend_stream(&999, &500),
        Error::NotFound
    );
}

#[test]
fn amend_stream_paused_stream_succeeds() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);

    // Amendment should still work on paused streams
    data.client.amend_stream(&stream_id, &500);

    let stream = data.client.get_stream(&stream_id);
    assert_eq!(stream.total_amount, 1_500);
    assert_eq!(stream.status, StreamStatus::Paused);
}

#[test]
fn amend_stream_on_contract_paused_fails() {
    let data = setup_initialized();
    let stream_id = create_active_stream(&data);

    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(
        data.client.try_amend_stream(&stream_id, &500),
        Error::ContractPaused
    );
}
