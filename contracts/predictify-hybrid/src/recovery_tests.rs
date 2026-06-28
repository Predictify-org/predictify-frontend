use super::*;
use soroban_sdk::testutils::Address as TestAddress;
use soroban_sdk::{symbol_short, vec, Address, Env, IntoVal, Val};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn setup_test() -> (Env, Address, PredictifyHybridClient) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, PredictifyHybrid);
    let client = PredictifyHybridClient::new(&env, &contract_id);

    env.mock_all_auths_allowing_non_root_auth();
    client.__constructor(&admin);

    (env, contract_id, client)
}

fn setup_market(env: &Env, contract_id: &Address, market_id: u64, expiration_ledger: u32) {
    env.as_contract(contract_id, || {
        env.storage().persistent().set(
            &DataKey::Market(market_id),
            &Market { status: MarketStatus::Active, expiration_ledger },
        );
    });
}

fn setup_participant(
    env: &Env,
    contract_id: &Address,
    market_id: u64,
    participant: &Address,
    balance: i128,
) {
    env.as_contract(contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(market_id, participant.clone()), &balance);

        let mut participants: soroban_sdk::Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Participants(market_id))
            .unwrap_or_else(|| Vec::new(env));
        participants.push_back(participant.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Participants(market_id), &participants);
    });
}

fn read_status(env: &Env, contract_id: &Address, market_id: u64) -> MarketStatus {
    let mut status = MarketStatus::Active;
    env.as_contract(contract_id, || {
        let market: Market = env
            .storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .unwrap();
        status = market.status;
    });
    status
}

fn read_balance(env: &Env, contract_id: &Address, market_id: u64, participant: &Address) -> i128 {
    let mut balance = 0i128;
    env.as_contract(contract_id, || {
        balance = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(market_id, participant.clone()))
            .unwrap_or(0);
    });
    balance
}

/// Count emitted events whose topics match the recovery event pattern
/// `(symbol_short!("predict"), symbol_short!("recover"))`.
fn recovery_event_count(env: &Env) -> u32 {
    let events = env.events().all();
    let predict_sym: Val = symbol_short!("predict").into_val(env);
    let recover_sym: Val = symbol_short!("recover").into_val(env);
    let mut count = 0u32;
    let mut i: u32 = 0;
    while i < events.len() {
        let (_, topics, _) = events.get(i).unwrap();
        if topics.len() >= 2
            && topics.get(0).unwrap() == predict_sym
            && topics.get(1).unwrap() == recover_sym
        {
            count += 1;
        }
        i += 1;
    }
    count
}

fn total_event_count(env: &Env) -> u32 {
    env.events().all().len()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// dry_run on a market that is past expiration with non-zero participant
/// balances returns a non-empty plan.
#[test]
fn test_dry_run_non_empty_plan() {
    let (env, contract_id, client) = setup_test();

    setup_market(&env, &contract_id, 1, 100);
    let alice = Address::generate(&env);
    setup_participant(&env, &contract_id, 1, &alice, 1000);

    env.ledger().with_mut(|l| l.sequence_number = 200);

    let plan = client.recover_dry_run(&vec![&env, 1u64]);

    assert!(
        plan.markets_recovered.len() > 0,
        "expected at least one market recovered"
    );
    assert!(
        plan.balances_mutated.len() > 0,
        "expected at least one balance mutation"
    );
    assert!(
        plan.total_tokens_recovered > 0,
        "expected non-zero total recovered"
    );
}

/// Storage (market status and participant balances) is unchanged after
/// dry_run.
#[test]
fn test_dry_run_storage_unchanged() {
    let (env, contract_id, client) = setup_test();

    setup_market(&env, &contract_id, 1, 100);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    setup_participant(&env, &contract_id, 1, &alice, 500);
    setup_participant(&env, &contract_id, 1, &bob, 300);

    env.ledger().with_mut(|l| l.sequence_number = 200);

    let status_before = read_status(&env, &contract_id, 1);
    let alice_before = read_balance(&env, &contract_id, 1, &alice);
    let bob_before = read_balance(&env, &contract_id, 1, &bob);

    client.recover_dry_run(&vec![&env, 1u64]);

    let status_after = read_status(&env, &contract_id, 1);
    let alice_after = read_balance(&env, &contract_id, 1, &alice);
    let bob_after = read_balance(&env, &contract_id, 1, &bob);

    assert_eq!(status_before, status_after);
    assert_eq!(alice_before, alice_after);
    assert_eq!(bob_before, bob_after);
}

/// No recovery-topic events are emitted during dry_run (the auth event
/// is not a recovery event).
#[test]
fn test_dry_run_no_recovery_events() {
    let (env, contract_id, client) = setup_test();

    setup_market(&env, &contract_id, 1, 100);
    let alice = Address::generate(&env);
    setup_participant(&env, &contract_id, 1, &alice, 1000);

    env.ledger().with_mut(|l| l.sequence_number = 200);

    let before_recovery = recovery_event_count(&env);

    client.recover_dry_run(&vec![&env, 1u64]);

    let after_recovery = recovery_event_count(&env);
    assert_eq!(before_recovery, after_recovery, "recovery events should not appear during dry_run");
}

/// Plan from dry_run is structurally identical to the plan from apply,
/// and the plan accurately describes the actual before/after storage
/// state.
#[test]
fn test_plan_matches_apply_diff() {
    let (env, contract_id, client) = setup_test();

    setup_market(&env, &contract_id, 1, 100);
    setup_market(&env, &contract_id, 2, 100);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);
    setup_participant(&env, &contract_id, 1, &alice, 500);
    setup_participant(&env, &contract_id, 1, &bob, 300);
    setup_participant(&env, &contract_id, 2, &charlie, 200);

    env.ledger().with_mut(|l| l.sequence_number = 200);

    // dry_run → plan
    let plan_dry = client.recover_dry_run(&vec![&env, 1u64, 2u64]);

    // Snapshot balances before apply so we can cross-check before-values.
    let mut before_snap: soroban_sdk::Vec<(u64, Address, i128)> = soroban_sdk::Vec::new(&env);
    {
        let mut i: u32 = 0;
        while i < plan_dry.balances_mutated.len() {
            let m = plan_dry.balances_mutated.get(i).unwrap();
            before_snap.push_back((m.market_id, m.participant.clone(), m.before));
            i += 1;
        }
    }

    // apply → plan
    let plan_apply = client.recover(&vec![&env, 1u64, 2u64]);

    // dry_run plan and apply plan are identical.
    assert_eq!(plan_dry, plan_apply);

    // Each mutation's before-value matches the dry_run snapshot.
    {
        let mut i: u32 = 0;
        while i < plan_apply.balances_mutated.len() {
            let m = plan_apply.balances_mutated.get(i).unwrap();

            // after must be 0 in storage.
            let after = read_balance(&env, &contract_id, m.market_id, &m.participant);
            assert_eq!(after, m.after);

            // before must match snapshot.
            let mut j: u32 = 0;
            let mut found = false;
            while j < before_snap.len() {
                let (mid, p, bal) = before_snap.get(j).unwrap();
                if mid == m.market_id && p == m.participant {
                    assert_eq!(bal, m.before);
                    found = true;
                    break;
                }
                j += 1;
            }
            assert!(found);
            i += 1;
        }
    }

    // Markets are now expired.
    assert_eq!(read_status(&env, &contract_id, 1), MarketStatus::Expired);
    assert_eq!(read_status(&env, &contract_id, 2), MarketStatus::Expired);

    // Recovery events were emitted during apply.
    assert!(recovery_event_count(&env) > 0);
}

/// Passing more market IDs than MAX_RECOVERY_MARKETS returns an error
/// (does not panic).
#[test]
fn test_too_many_markets_error() {
    let (env, _contract_id, client) = setup_test();

    // Create Vec with MAX_RECOVERY_MARKETS + 1 entries.
    let mut ids = vec![&env];
    for i in 0..(MAX_RECOVERY_MARKETS + 1) {
        ids.push_back(i as u64);
    }

    let result = client.try_recover_dry_run(&ids);
    assert!(result.is_err());
}

/// A market with more non-zero participants than MAX_BALANCE_MUTATIONS
/// causes a PlanTooLarge error.
#[test]
fn test_plan_too_large_error() {
    let (env, contract_id, client) = setup_test();

    // Single market with MAX_BALANCE_MUTATIONS + 1 participants.
    setup_market(&env, &contract_id, 1, 100);

    let count = MAX_BALANCE_MUTATIONS + 1;
    let mut participants: soroban_sdk::Vec<Address> = soroban_sdk::Vec::new(&env);

    // Generate unique participants and set up balances via storage
    // directly (no auth needed for setup).
    for i in 0..count {
        let p = Address::generate(&env);
        participants.push_back(p.clone());
        setup_participant(&env, &contract_id, 1, &p, (i as i128) + 1);
    }

    env.ledger().with_mut(|l| l.sequence_number = 200);

    let result = client.try_recover_dry_run(&vec![&env, 1u64]);
    assert!(result.is_err());
}

/// dry_run with no eligible markets (empty input) returns an empty-but-
/// valid plan, not an error.
#[test]
fn test_dry_run_zero_effect_no_markets() {
    let (env, _contract_id, client) = setup_test();

    let ids: soroban_sdk::Vec<u64> = vec![&env];

    let plan = client.recover_dry_run(&ids);

    assert_eq!(plan.markets_recovered.len(), 0);
    assert_eq!(plan.balances_mutated.len(), 0);
    assert_eq!(plan.events_summary.len(), 0);
    assert_eq!(plan.total_tokens_recovered, 0);
}

/// dry_run with markets that are already expired returns an empty plan.
#[test]
fn test_dry_run_zero_effect_already_expired() {
    let (env, contract_id, client) = setup_test();

    // Market already expired.
    env.as_contract(&contract_id, || {
        env.storage().persistent().set(
            &DataKey::Market(1),
            &Market { status: MarketStatus::Expired, expiration_ledger: 100 },
        );
    });

    let plan = client.recover_dry_run(&vec![&env, 1u64]);

    assert_eq!(plan.markets_recovered.len(), 0);
    assert_eq!(plan.total_tokens_recovered, 0);
}

/// dry_run with a market that is still active but not yet expired
/// returns an empty plan.
#[test]
fn test_dry_run_zero_effect_not_expired_yet() {
    let (env, contract_id, client) = setup_test();

    // Market expires at ledger 500, current is 50.
    setup_market(&env, &contract_id, 1, 500);

    let plan = client.recover_dry_run(&vec![&env, 1u64]);

    assert_eq!(plan.markets_recovered.len(), 0);
    assert_eq!(plan.total_tokens_recovered, 0);
}
