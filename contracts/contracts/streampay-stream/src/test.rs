#![cfg(test)]

extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{storage, Stream, StreamPayContract, StreamPayContractClient, StreamStatus};

fn make_stream(
    sender: &Address,
    recipient: &Address,
    token: &Address,
    status: StreamStatus,
) -> Stream {
    Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token: token.clone(),
        total_amount: 1_000_000_000_i128,
        released_amount: 0_i128,
        start_time: 1_000_000_u64,
        end_time: 2_000_000_u64,
        last_update: 1_000_000_u64,
        status,
    }
}

fn setup() -> (Env, StreamPayContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, StreamPayContract);
    let client = StreamPayContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_initialize_sets_admin() {
    let (_env, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_initialize_sets_stream_count_to_zero() {
    let (_env, client, _admin) = setup();
    assert_eq!(client.stream_count(), 0u64);
}

#[test]
#[should_panic(expected = "already initialised")]
fn test_double_initialize_panics() {
    let (_env, client, admin) = setup();
    client.initialize(&admin);
}

#[test]
fn test_stream_count_increments_per_create() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    assert_eq!(client.stream_count(), 0u64);
    client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Draft));
    assert_eq!(client.stream_count(), 1u64);
    client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Active));
    assert_eq!(client.stream_count(), 2u64);
}

#[test]
fn test_create_stream_returns_sequential_ids() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    assert_eq!(client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Draft)), 0u64);
    assert_eq!(client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Draft)), 1u64);
    assert_eq!(client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Draft)), 2u64);
}

#[test]
fn test_stream_round_trips_all_fields() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    let original = Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token: token.clone(),
        total_amount: 5_000_000_i128,
        released_amount: 250_000_i128,
        start_time: 100_u64,
        end_time: 999_u64,
        last_update: 150_u64,
        status: StreamStatus::Active,
    };
    let id = client.create_stream(&original);
    let fetched = client.get_stream(&id).expect("stream must exist");
    assert_eq!(fetched.sender, sender);
    assert_eq!(fetched.recipient, recipient);
    assert_eq!(fetched.token, token);
    assert_eq!(fetched.total_amount, 5_000_000_i128);
    assert_eq!(fetched.released_amount, 250_000_i128);
    assert_eq!(fetched.start_time, 100_u64);
    assert_eq!(fetched.end_time, 999_u64);
    assert_eq!(fetched.last_update, 150_u64);
    assert_eq!(fetched.status, StreamStatus::Active);
}

#[test]
fn test_get_stream_missing_id_returns_none() {
    let (_env, client, _admin) = setup();
    assert!(client.get_stream(&99u64).is_none());
    assert!(client.get_stream(&0u64).is_none());
}

fn assert_status_round_trips(status: StreamStatus) {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    let id = client.create_stream(&make_stream(&sender, &recipient, &token, status.clone()));
    let fetched = client.get_stream(&id).expect("stream must exist");
    assert_eq!(fetched.status, status);
}

#[test]
fn test_status_draft_round_trips()     { assert_status_round_trips(StreamStatus::Draft); }
#[test]
fn test_status_active_round_trips()    { assert_status_round_trips(StreamStatus::Active); }
#[test]
fn test_status_paused_round_trips()    { assert_status_round_trips(StreamStatus::Paused); }
#[test]
fn test_status_settled_round_trips()   { assert_status_round_trips(StreamStatus::Settled); }
#[test]
fn test_status_ended_round_trips()     { assert_status_round_trips(StreamStatus::Ended); }
#[test]
fn test_status_cancelled_round_trips() { assert_status_round_trips(StreamStatus::Cancelled); }

#[test]
fn test_update_stream_overwrites_record() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    let id = client.create_stream(&make_stream(&sender, &recipient, &token, StreamStatus::Draft));
    let updated = Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token: token.clone(),
        total_amount: 1_000_000_000_i128,
        released_amount: 500_000_000_i128,
        start_time: 1_000_000_u64,
        end_time: 2_000_000_u64,
        last_update: 1_500_000_u64,
        status: StreamStatus::Active,
    };
    client.update_stream(&id, &updated);
    let fetched = client.get_stream(&id).expect("stream must exist after update");
    assert_eq!(fetched.released_amount, 500_000_000_i128);
    assert_eq!(fetched.last_update, 1_500_000_u64);
    assert_eq!(fetched.status, StreamStatus::Active);
}

#[test]
#[should_panic(expected = "stream not found")]
fn test_update_nonexistent_stream_panics() {
    let (env, client, _admin) = setup();
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    client.update_stream(&42u64, &make_stream(&sender, &recipient, &token, StreamStatus::Active));
}

// ── Storage module unit tests (must run inside env.as_contract()) ─────────────

#[test]
fn test_storage_next_stream_id_is_monotonic() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, StreamPayContract);
    env.as_contract(&contract_id, || {
        storage::set_stream_count(&env, 0u64);
        assert_eq!(storage::next_stream_id(&env), 0u64);
        assert_eq!(storage::next_stream_id(&env), 1u64);
        assert_eq!(storage::next_stream_id(&env), 2u64);
        assert_eq!(storage::get_stream_count(&env), 3u64);
    });
}

#[test]
fn test_storage_stream_exists_false_for_missing() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, StreamPayContract);
    env.as_contract(&contract_id, || {
        assert!(!storage::stream_exists(&env, 0u64));
        assert!(!storage::stream_exists(&env, 999u64));
    });
}

#[test]
fn test_storage_set_get_stream_round_trip() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, StreamPayContract);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    let stream = make_stream(&sender, &recipient, &token, StreamStatus::Paused);
    env.as_contract(&contract_id, || {
        storage::set_stream(&env, 7u64, &stream);
        assert!(storage::stream_exists(&env, 7u64));
        let fetched = storage::get_stream(&env, 7u64).expect("must be present");
        assert_eq!(fetched.status, StreamStatus::Paused);
        assert_eq!(fetched.total_amount, 1_000_000_000_i128);
    });
}

#[test]
fn test_storage_get_stream_missing_returns_none() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, StreamPayContract);
    env.as_contract(&contract_id, || {
        assert!(storage::get_stream(&env, 0u64).is_none());
    });
}
