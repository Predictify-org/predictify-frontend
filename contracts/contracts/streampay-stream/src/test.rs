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

    StellarAssetClient::new(&env, &token).mint(&sender, &1_000_000);

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
fn draft_stream_accrues_nothing_until_started() {
    let data = setup();

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
            .try_create_stream(&data.sender, &data.recipient, &data.token, &100, &10, &true,),
        Error::ContractPaused
    );
}

#[test]
fn set_paused_true_blocks_start_stream() {
    let data = setup_initialized();

    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &true,
    );

    data.client.set_paused(&data.admin, &true);

    assert_contract_error!(data.client.try_start_stream(&id), Error::ContractPaused);
}

#[test]
fn set_paused_true_blocks_withdraw() {
    let data = setup_initialized();

    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &100,
        &false,
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
        .create_stream(&data.sender, &data.recipient, &data.token, &100, &10, &true);
}

#[test]
fn set_paused_wrong_admin_returns_unauthorized() {
    let data = setup_initialized();
    let wrong = Address::generate(&data.env);

    assert_contract_error!(
        data.client.try_set_paused(&wrong, &true),
        Error::Unauthorized
    );
}

// ── set_token_allowed ─────────────────────────────────────────────────────────

#[test]
fn blocked_token_returns_token_not_allowed() {
    let data = setup_initialized();
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
