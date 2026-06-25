#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, Env, IntoVal, Val,
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
    // Establish a SAC balance entry for recipient so the trustline check in
    // create_stream passes. A mint of 0 is rejected by the SAC; use 1.
    StellarAssetClient::new(&env, &token).mint(&recipient, &1);

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
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &true,
    );
    data.env.ledger().set_timestamp(2_000);
    assert_eq!(data.client.withdrawable(&stream_id), 0);
    assert_eq!(data.client.stream_balance(&stream_id), 0);

    data.client.start_stream(&stream_id);
    data.env.ledger().set_timestamp(2_050);
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
        &100,
        &false,
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
        &100,
        &true,
    );

    let before_admin_ttl = data.env.storage().instance().get_ttl(&DataKey::Admin);
    let before_next_id_ttl = data
        .env
        .storage()
        .instance()
        .get_ttl(&DataKey::NextStreamId);

    data.env.ledger().set_timestamp(1_050);
    data.client.set_paused(&data.admin, &false);
    let _ = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &500,
        &10,
        &true,
    );

    let after_admin_ttl = data.env.storage().instance().get_ttl(&DataKey::Admin);
    let after_next_id_ttl = data
        .env
        .storage()
        .instance()
        .get_ttl(&DataKey::NextStreamId);

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
        &10,
        &false,
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
        &10,
        &true,
    );

    let wrong = Address::generate(&data.env);
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
        &10,
        &false,
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
        &10,
        &false,
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
        &10,
        &false,
    );
    data.client.pause(&id);

    data.env.mock_auths(&[]);
    data.client.resume(&id);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn cancel_stream_wrong_sender_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &10,
        &false,
    );

    data.env.mock_auths(&[]);
    data.client.cancel_stream(&id);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn settle_wrong_recipient_fails() {
    let data = setup_initialized();
    let id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &100,
        &10,
        &false,
    );

    data.env.mock_auths(&[]);
    data.client.settle(&id);
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
    assert_budget_ceiling(&snapshot, 400_000, 65_000, 12, 5, 200, 1_400);
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

// ── SEP-41 Trustline tests ────────────────────────────────────────────────────

/// Verifies that the trustline check path in `create_stream` is exercised
/// without error for any SEP-41 token — including SAC tokens registered in the
/// test environment. In testutils, the SAC's `balance()` returns 0 for unknown
/// addresses rather than trapping, so the check is a no-op (the stream is
/// created successfully). This documents the SEP-41 limitation: only production
/// SAC tokens on the Stellar network enforce hard trustline requirements at the
/// host level. The `try_balance` guard protects against those production-only
/// traps via `Error::RecipientNotTrusted`.
#[test]
fn create_stream_trustline_check_runs_without_error_for_sep41_token() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    // In testutils, a fresh address has no balance entry but balance() returns 0
    // rather than trapping — this is the documented SEP-41 test-env behaviour.
    let recipient_no_entry = Address::generate(&env);

    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    StellarAssetClient::new(&env, &token).mint(&sender, &10_000);
    client.initialize(&admin);

    // In the test environment the SAC returns 0 for any address (no trustline
    // enforcement), so try_balance succeeds and the stream is created.
    let stream_id = client.create_stream(
        &sender,
        &recipient_no_entry,
        &token,
        &1_000,
        &1_000,
        &1_100,
    );
    assert!(stream_id > 0);
}

/// If the recipient has an existing balance entry (including zero balance after
/// spend), stream creation must succeed — a zero balance is a valid trustline.
#[test]
fn create_stream_recipient_with_trustline_succeeds() {
    let data = setup_initialized();

    // setup() already mints 1 token to recipient, establishing a trustline.
    // Stream creation should succeed because try_balance returns Ok.
    let stream_id = data.client.create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );
    assert!(stream_id > 0);
}

/// The trustline check calls `try_balance` *before* the escrow `transfer`.
/// If `try_balance` itself succeeded but `transfer` were to fail, funds would
/// not be locked. This test verifies the ordering by confirming sender balance
/// is unchanged when the stream-creation call is rolled back (here we roll back
/// by simulating a failed call path via a blocked token — the important thing
/// is that no partial-escrow scenario exists).
#[test]
fn create_stream_token_blocked_does_not_escrow_funds() {
    let data = setup_initialized();
    data.client
        .set_token_allowed(&data.admin, &data.token, &false);

    let sender_balance_before =
        soroban_sdk::token::TokenClient::new(&data.env, &data.token).balance(&data.sender);

    let _ = data.client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.token,
        &1_000,
        &1_000,
        &1_100,
    );

    let sender_balance_after =
        soroban_sdk::token::TokenClient::new(&data.env, &data.token).balance(&data.sender);

    assert_eq!(
        sender_balance_before, sender_balance_after,
        "sender balance must be unchanged after failed create_stream"
    );
}

/// Error variant `RecipientNotTrusted` is defined with discriminant 10 and
/// compiles as part of the public contract API.
#[test]
fn recipient_not_trusted_error_variant_exists() {
    // Confirm the discriminant is stable (part of public contract ABI).
    assert_eq!(Error::RecipientNotTrusted as u32, 10);
}

/// Trustline check interacts correctly with the pause guard: a paused contract
/// returns `ContractPaused` before the trustline check runs.
#[test]
fn create_stream_paused_takes_priority_over_trustline_check() {
    let data = setup_initialized();
    data.client.set_paused(&data.admin, &true);

    let any_recipient = Address::generate(&data.env);

    // ContractPaused must be the error — pause guard fires before trustline check.
    assert_contract_error!(
        data.client.try_create_stream(
            &data.sender,
            &any_recipient,
            &data.token,
            &1_000,
            &1_000,
            &1_100,
        ),
        Error::ContractPaused
    );
}

#[test]
fn create_stream_emits_created_event() {
    let data = setup_initialized();
    data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0) == Some(symbol_short!("stream").into_val(&data.env))
            && topics.get(1) == Some(symbol_short!("created").into_val(&data.env))
    });
    assert!(found, "expected 'stream.created' event after create_stream");
}

#[test]
fn start_stream_emits_started_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &true,
    );
    data.env.ledger().set_timestamp(2_000);
    data.client.start_stream(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0) == Some(symbol_short!("stream").into_val(&data.env))
            && topics.get(1) == Some(symbol_short!("started").into_val(&data.env))
    });
    assert!(found, "expected 'stream.started' event after start_stream");
}

#[test]
fn withdraw_emits_withdrawn_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.withdraw(&stream_id, &300);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0) == Some(symbol_short!("stream").into_val(&data.env))
            && topics.get(1) == Some(symbol_short!("withdrawn").into_val(&data.env))
    });
    assert!(found, "expected 'stream.withdrawn' event after withdraw");
}

#[test]
fn full_withdraw_emits_settled_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    data.env.ledger().set_timestamp(1_100);
    data.client.withdraw(&stream_id, &1_000);
    let events = data.env.events().all();
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1) == Some(symbol_short!("withdrawn").into_val(&data.env))
    });
    let has_settled = events.iter().any(|(_, topics, _)| {
        topics.get(1) == Some(symbol_short!("settled").into_val(&data.env))
    });
    assert!(has_withdrawn, "expected 'stream.withdrawn' event on full withdrawal");
    assert!(has_settled, "expected 'stream.settled' event after full withdrawal");
}

#[test]
fn pause_emits_paused_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0) == Some(symbol_short!("stream").into_val(&data.env))
            && topics.get(1) == Some(symbol_short!("paused").into_val(&data.env))
    });
    assert!(found, "expected 'stream.paused' event after pause");
}

#[test]
fn resume_emits_resumed_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    data.env.ledger().set_timestamp(1_050);
    data.client.pause(&stream_id);
    data.env.ledger().set_timestamp(1_100);
    data.client.resume(&stream_id);
    let events = data.env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.len() == 2
            && topics.get(0) == Some(symbol_short!("stream").into_val(&data.env))
            && topics.get(1) == Some(symbol_short!("resumed").into_val(&data.env))
    });
    assert!(found, "expected 'stream.resumed' event after resume");
}

#[test]
fn failed_withdraw_emits_no_event() {
    let data = setup_initialized();
    let stream_id = data.client.create_stream(
        &data.sender, &data.recipient, &data.token, &1_000, &100, &false,
    );
    data.env.ledger().set_timestamp(1_050);
    let _ = data.client.try_withdraw(&stream_id, &600);
    let events = data.env.events().all();
    let has_withdrawn = events.iter().any(|(_, topics, _)| {
        topics.get(1) == Some(symbol_short!("withdrawn").into_val(&data.env))
    });
    assert!(!has_withdrawn, "no 'withdrawn' event should be emitted on a failed withdrawal");
}

// ── Contract metadata tests ───────────────────────────────────────────────────
//
// The `contractmeta!` macro encodes key/value pairs into the compiled WASM
// binary's `contractmetav0` custom section.  Those bytes are only present in
// the WASM output, not in the Soroban testutils environment, so we cannot read
// them back through `env` at runtime.
//
// Instead, we test the *constants* that are the single source of truth for the
// three metadata values.  Because both the `contractmeta!` macro invocations
// and these tests reference the same constants (`CONTRACT_NAME`, etc.), there
// is no way for the compiled WASM metadata and the test expectations to drift
// apart.
//
// To verify the metadata is actually present in the WASM binary you can run:
//   stellar contract info --wasm target/wasm32v1-none/release/streampay_stream.wasm

/// Contract name must be the canonical package identifier used in tooling.
#[test]
fn contract_metadata_name_is_correct() {
    assert_eq!(
        CONTRACT_NAME,
        "streampay-stream",
        "CONTRACT_NAME must match the value passed to contractmeta!(key=\"name\")"
    );
}

/// Contract version must be a valid semver string.
///
/// The test enforces the MAJOR.MINOR.PATCH format so a missing or malformed
/// version is caught at CI time rather than discovered via off-chain tooling.
#[test]
fn contract_metadata_version_is_semver() {
    // Verify three dot-separated numeric components.
    let parts: Vec<&str> = CONTRACT_VERSION.split('.').collect();
    assert_eq!(
        parts.len(),
        3,
        "CONTRACT_VERSION '{}' must follow MAJOR.MINOR.PATCH semver",
        CONTRACT_VERSION
    );
    for part in &parts {
        assert!(
            part.parse::<u32>().is_ok(),
            "CONTRACT_VERSION component '{}' must be a non-negative integer",
            part
        );
    }
    // Pin to the current release so accidental bumps are caught in review.
    assert_eq!(
        CONTRACT_VERSION,
        "0.1.0",
        "CONTRACT_VERSION must match the value passed to contractmeta!(key=\"version\")"
    );
}

/// Repository URL must be a non-empty HTTPS URL pointing to the source repo.
#[test]
fn contract_metadata_repo_is_https_url() {
    assert!(
        CONTRACT_REPO.starts_with("https://"),
        "CONTRACT_REPO '{}' must be an HTTPS URL",
        CONTRACT_REPO
    );
    assert!(
        !CONTRACT_REPO.is_empty(),
        "CONTRACT_REPO must not be empty"
    );
    assert_eq!(
        CONTRACT_REPO,
        "https://github.com/stream-pay/StreamPay-Frontend",
        "CONTRACT_REPO must match the value passed to contractmeta!(key=\"repo\")"
    );
}
