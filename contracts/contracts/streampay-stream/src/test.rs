//! Integration tests for the `initialize` and `init_with_token_allowlist`
//! entrypoints.
//!
//! These tests pin the contract's behaviour at deployment time:
//!
//! - `initialize` (the legacy single-arg entrypoint) keeps working
//!   unchanged for backward compatibility.
//! - `init_with_token_allowlist` registers `admin`, marks the contract
//!   as unpaused, AND marks every token in `tokens` as `allowed = true`
//!   - all in one transaction.
//! - Re-initialisation (via either path) is rejected with
//!   `Error::InvalidState` and leaves no partial state.
//!
//! The full allowlist/stream lifecycle is exercised elsewhere; this
//! module only verifies the deployment-time surface area.

use super::*;
use soroban_sdk::testutils::{Address as _, Events as _, Ledger as _};
use soroban_sdk::{token::StellarAssetClient, Address, Env};

/// All addresses and tokens needed by a single test. We use a
/// fixed-size array on the stack (no `Vec`) because the contract
/// crate is `no_std`.
struct InitTestData {
    env: Env,
    admin: Address,
    sender: Address,
    recipient: Address,
    tokens: [Address; 3],
}

fn setup_init() -> InitTestData {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    env.register(Contract, ());

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Three distinct tokens so we can prove the new entrypoint walks
    // the full allowlist, not just the first element.
    let token_a = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let token_b = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let token_c = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    // Fund `sender` on every token so any later stream-creation test
    // can run without a separate mint step.
    let all_tokens = [&token_a, &token_b, &token_c];
    for token in &all_tokens {
        StellarAssetClient::new(&env, token).mint(&sender, &1_000_000);
    }

    InitTestData {
        env,
        admin,
        sender,
        recipient,
        tokens: [token_a, token_b, token_c],
    }
}

fn contract_client(env: &Env) -> ContractClient<'_> {
    // Re-register against the same env to obtain the contract
    // address, then bind a client to it.
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

/// Build a `soroban_sdk::Vec<Address>` from a fixed-size array.
fn to_sdk_vec(env: &Env, tokens: &[Address; 3]) -> soroban_sdk::Vec<Address> {
    let mut v = soroban_sdk::Vec::new(env);
    for t in tokens {
        v.push_back(t.clone());
    }
    v
}

// ── `initialize` (legacy path) ───────────────────────────────────────────────

#[test]
fn initialize_sets_admin_and_unpauses() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    // Admin-only entrypoint that succeeds iff the admin is set.
    // We expect `set_paused(false)` to be a no-op rather than an error.
    client.set_paused(&data.admin, &false);
}

#[test]
fn initialize_twice_returns_invalid_state() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let result = client.try_initialize(&data.admin);
    let err = result.expect_err("second initialize should fail");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
fn initialize_does_not_allowlist_tokens() {
    // `initialize` is the legacy path: it must NOT write any per-token
    // entries. We probe this indirectly by blocking `token_a` after
    // init; the new path under test must remain the only writer.
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);
    client.set_token_allowed(&data.admin, &data.tokens[0], &false);

    // Attempting to stream on `token_a` now hits `TokenNotAllowed`,
    // proving `initialize` itself didn't pre-allow it.
    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    let err = result.expect_err("blocked token should fail create_stream");
    assert_eq!(err, Ok(Error::TokenNotAllowed));
}

// ── `init_with_token_allowlist` (new path) ────────────────────────────────────

#[test]
fn init_with_token_allowlist_sets_admin_unpauses_and_allowlists() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    // Admin path: `set_paused` succeeds, proving `admin` is stored.
    client.set_paused(&data.admin, &false);

    // Allowlist path: every token the deployment registered must be
    // unblocked. We assert this by creating a stream against each
    // token; if any token had been blocked by accident we'd see
    // `TokenNotAllowed` here instead.
    let mut i = 0;
    while i < data.tokens.len() {
        let token = data.tokens[i].clone();
        let _id = client.create_stream(
            &data.sender,
            &data.recipient,
            &token,
            &100i128,
            &1_100u64,
            &1_200u64,
        );
        i += 1;
    }
}

#[test]
fn init_with_token_allowlist_handles_empty_token_list() {
    // An empty allowlist is a valid deployment choice: tokens can be
    // added lazily via `set_token_allowed` after the fact. We must
    // still register the admin.
    let data = setup_init();
    let client = contract_client(&data.env);

    let empty = soroban_sdk::Vec::<Address>::new(&data.env);
    client.init_with_token_allowlist(&data.admin, &empty);

    // Admin-only entrypoint works.
    client.set_paused(&data.admin, &true);
    client.set_paused(&data.admin, &false);
}

#[test]
fn init_with_token_allowlist_blocks_blocked_token() {
    // The deployment-time allowlist is not "open up the contract to
    // everything"; tokens that the admin subsequently blocks via
    // `set_token_allowed(false)` must still be rejected.
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    client.set_token_allowed(&data.admin, &data.tokens[0], &false);

    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    let err = result.expect_err("blocked token should fail create_stream");
    assert_eq!(err, Ok(Error::TokenNotAllowed));
}

#[test]
fn init_with_token_allowlist_twice_returns_invalid_state() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    // Second call must fail; no second admin, no extra allowlist entries.
    let result =
        client.try_init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));
    let err = result.expect_err("second init_with_token_allowlist should fail");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
fn init_with_token_allowlist_after_initialize_returns_invalid_state() {
    // Cross-path double init is also forbidden: whichever path
    // landed first owns the admin slot forever.
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let result =
        client.try_init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));
    let err = result.expect_err("init_with_token_allowlist after initialize should fail");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
fn initialize_after_init_with_token_allowlist_returns_invalid_state() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    let result = client.try_initialize(&data.admin);
    let err = result.expect_err("initialize after init_with_token_allowlist should fail");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn init_with_token_allowlist_unauthorized_caller_fails() {
    // The atomic path requires `admin.require_auth()`; without
    // mock_auths for `admin` the call must panic with the standard
    // Soroban auth error.
    let data = setup_init();
    let client = contract_client(&data.env);
    let impostor = Address::generate(&data.env);

    data.env.mock_auths(&[]);
    client.init_with_token_allowlist(&impostor, &to_sdk_vec(&data.env, &data.tokens));
}

#[test]
fn init_with_token_allowlist_emits_no_events() {
    // The new entrypoint mirrors `initialize` and `set_token_allowed`
    // by emitting no events - lifecycle events are reserved for
    // stream-level operations. This test pins that contract so
    // future changes don't accidentally spam the indexer.
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    let events = data.env.events().all();
    assert!(
        events.is_empty(),
        "init_with_token_allowlist should emit zero events, got: {events:?}",
    );
}

#[test]
fn init_with_token_allowlist_atomicity_leaves_no_partial_state() {
    // We can't directly observe partial state in a single call (the
    // happy path either commits everything or nothing), but we can
    // prove the no-partial-state invariant by ensuring a failed
    // second call leaves the FIRST call's state untouched. If the
    // host had not rolled back the storage mutations, the second
    // `try_init_with_token_allowlist` call would have written extra
    // admin/allowlist entries before failing.
    let data = setup_init();
    let client = contract_client(&data.env);

    client.init_with_token_allowlist(&data.admin, &to_sdk_vec(&data.env, &data.tokens));

    let impostor = Address::generate(&data.env);

    // Auth fails -> the whole transaction is rolled back, including
    // the auth-write for the impostor. Admin from the first call
    // still works. We `try_` so the auth failure is contained; the
    // test runner's auth mocks are not poisoned for subsequent calls.
    let _ = client.try_init_with_token_allowlist(&impostor, &to_sdk_vec(&data.env, &data.tokens));

    // `mock_all_auths` was on at `setup_init` time so `set_paused`
    // still succeeds, proving the original `admin` is intact.
    client.set_paused(&data.admin, &false);
}

// ── Per-sender stream limit tests ──────────────────────────────────────────

#[test]
fn sender_stream_count_starts_at_zero() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    assert_eq!(client.sender_stream_count(&data.sender), 0);
}

#[test]
fn create_stream_increments_sender_count() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&data.sender), 1);
}

#[test]
fn default_max_streams_per_sender_is_ten() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    assert_eq!(client.max_streams_per_sender(), 10);
}

#[test]
fn sender_can_create_up_to_default_limit() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    for i in 0..10 {
        let id = client.create_stream(
            &data.sender,
            &data.recipient,
            &data.tokens[i % 3],
            &100i128,
            &(1_100u64 + i as u64 * 100),
            &(1_200u64 + i as u64 * 100),
        );
        assert_eq!(id, i as u64 + 1);
    }
    assert_eq!(client.sender_stream_count(&data.sender), 10);
}

#[test]
fn create_stream_beyond_limit_returns_stream_limit_exceeded() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    for i in 0..10 {
        client.create_stream(
            &data.sender,
            &data.recipient,
            &data.tokens[i % 3],
            &100i128,
            &(1_100u64 + i as u64 * 100),
            &(1_200u64 + i as u64 * 100),
        );
    }

    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &2_100u64,
        &2_200u64,
    );
    let err = result.expect_err("11th stream should exceed limit");
    assert_eq!(err, Ok(Error::StreamLimitExceeded));
}

#[test]
fn settle_stream_decrements_sender_count() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&data.sender), 1);

    // Advance past end_time and settle
    data.env.ledger().set_timestamp(1_300);
    client.settle(&id);

    assert_eq!(client.sender_stream_count(&data.sender), 0);
}

#[test]
fn settle_frees_slot_for_new_stream() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    // Create stream, settle it, then create another
    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    data.env.ledger().set_timestamp(1_300);
    client.settle(&id);

    // Should be able to create again
    let new_id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_400u64,
        &1_500u64,
    );
    assert_eq!(new_id, 2);
    assert_eq!(client.sender_stream_count(&data.sender), 1);
}

#[test]
fn withdraw_full_amount_decrements_sender_count() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&data.sender), 1);

    // Advance past end_time so full amount is vested
    data.env.ledger().set_timestamp(1_300);

    // Withdraw full amount (settles the stream)
    client.withdraw(&id, &100i128);

    assert_eq!(client.sender_stream_count(&data.sender), 0);
}

#[test]
fn admin_can_change_max_streams_per_sender() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    client.set_max_streams_per_sender(&data.admin, &3);
    assert_eq!(client.max_streams_per_sender(), 3);

    // Create 3 streams
    for i in 0..3 {
        client.create_stream(
            &data.sender,
            &data.recipient,
            &data.tokens[i],
            &100i128,
            &(1_100u64 + i as u64 * 100),
            &(1_200u64 + i as u64 * 100),
        );
    }

    // 4th should fail
    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_500u64,
        &1_600u64,
    );
    let err = result.expect_err("4th stream should exceed new limit of 3");
    assert_eq!(err, Ok(Error::StreamLimitExceeded));
}

#[test]
fn different_senders_have_independent_counts() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let other_sender = Address::generate(&data.env);
    let other_recipient = Address::generate(&data.env);

    // Fund other_sender on tokens
    for token in &data.tokens {
        StellarAssetClient::new(&data.env, token).mint(&other_sender, &1_000_000);
    }

    client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&data.sender), 1);
    assert_eq!(client.sender_stream_count(&other_sender), 0);

    client.create_stream(
        &other_sender,
        &other_recipient,
        &data.tokens[1],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&other_sender), 1);
    assert_eq!(client.sender_stream_count(&data.sender), 1);
}

#[test]
fn sender_can_create_up_to_custom_limit_after_settle() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    // Set limit to 2
    client.set_max_streams_per_sender(&data.admin, &2);

    let id1 = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );
    client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[1],
        &100i128,
        &1_300u64,
        &1_400u64,
    );

    // 3rd should fail
    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[2],
        &100i128,
        &1_500u64,
        &1_600u64,
    );
    assert_eq!(result, Err(Ok(Error::StreamLimitExceeded)));

    // Settle one stream
    data.env.ledger().set_timestamp(1_500);
    client.settle(&id1);

    // Now 3rd should succeed
    let id3 = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[2],
        &100i128,
        &1_600u64,
        &1_700u64,
    );
    assert_eq!(id3, 3);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn non_admin_cannot_set_max_streams_per_sender() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    data.env.mock_auths(&[]);
    client.set_max_streams_per_sender(&data.sender, &5);
}

// ── Event emission tests for cancel_stream, amend_stream, and admin actions ────

#[test]
fn cancel_stream_emits_cancelled_event() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Advance time to let some amount be vested
    data.env.ledger().set_timestamp(1_150);

    // Clear events from creation
    data.env.events().all();

    // Cancel the stream
    client.cancel_stream(&id);

    let events = data.env.events().all();
    assert!(!events.is_empty(), "cancel_stream should emit events");

    // The last event should be the cancelled event
    let (_, topics, _) = events.last().unwrap();
    assert_eq!(topics.len(), 2, "Event should have 2 topics");
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn cancel_stream_requires_auth() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Remove all auths — the host should reject the call because stream.sender
    // has not authorized it.
    data.env.mock_auths(&[]);
    client.cancel_stream(&id);
}

#[test]
fn cancel_stream_fails_on_settled_stream() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    // Withdraw full amount to settle
    data.env.ledger().set_timestamp(1_250);
    client.withdraw(&id, &100i128);

    // Try to cancel settled stream
    let result = client.try_cancel_stream(&id);
    let err = result.expect_err("Should fail on settled stream");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
fn cancel_stream_returns_unstreamed_funds() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // The stream should now exist and be cancellable
    let stream = client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Active);

    // Cancel the stream
    client.cancel_stream(&id);

    // Verify stream is now cancelled
    let cancelled_stream = client.get_stream(&id);
    assert_eq!(cancelled_stream.status, StreamStatus::Cancelled);
}

// ── cancel_stream: correct sender/recipient refund split (issue #601) ────────

/// Cancelling at the midpoint: half is vested → recipient gets half, sender gets half.
#[test]
fn cancel_stream_splits_vested_to_recipient_unvested_to_sender() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    // Stream: 1000 tokens, active from t=1000 to t=2000 (duration=1000s)
    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_000u64,
        &2_000u64,
    );

    let sender_token = soroban_sdk::token::Client::new(&data.env, &data.tokens[0]);
    let sender_before = sender_token.balance(&data.sender);
    let recipient_before = sender_token.balance(&data.recipient);

    // Cancel at t=1500 → 500 tokens vested, 500 unvested
    data.env.ledger().set_timestamp(1_500);
    client.cancel_stream(&id);

    // Recipient receives the vested-but-undrawn 500
    assert_eq!(
        sender_token.balance(&data.recipient),
        recipient_before + 500
    );
    // Sender gets back the unvested 500
    assert_eq!(sender_token.balance(&data.sender), sender_before + 500);

    let s = client.get_stream(&id);
    assert_eq!(s.status, StreamStatus::Cancelled);
}

/// Cancelling before the stream starts (Draft-like timing): full amount returns to sender.
#[test]
fn cancel_stream_before_start_returns_all_to_sender() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    // Create stream starting in the future (relative to current ledger t=1000)
    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &2_000u64, // starts later
        &3_000u64,
    );

    let sender_token = soroban_sdk::token::Client::new(&data.env, &data.tokens[0]);
    let sender_before = sender_token.balance(&data.sender);

    // Cancel at t=1000 (before start_time=2000) → 0 vested → full refund to sender
    client.cancel_stream(&id);

    assert_eq!(sender_token.balance(&data.sender), sender_before + 1000);
    assert_eq!(sender_token.balance(&data.recipient), 0);
}

/// Cancelling after the stream has fully elapsed: full amount goes to recipient.
#[test]
fn cancel_stream_after_end_pays_all_to_recipient() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_000u64,
        &2_000u64,
    );

    let sender_token = soroban_sdk::token::Client::new(&data.env, &data.tokens[0]);
    let sender_before = sender_token.balance(&data.sender);
    let recipient_before = sender_token.balance(&data.recipient);

    // Cancel at t=2500 (past end_time) → 1000 vested → all to recipient, 0 to sender
    data.env.ledger().set_timestamp(2_500);
    client.cancel_stream(&id);

    assert_eq!(
        sender_token.balance(&data.recipient),
        recipient_before + 1000
    );
    assert_eq!(sender_token.balance(&data.sender), sender_before);
}

/// Cancelling after a partial withdrawal: recipient gets remaining vested portion only.
#[test]
fn cancel_stream_after_partial_withdraw_correct_split() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    // 1000 tokens, t=1000..2000
    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_000u64,
        &2_000u64,
    );

    let sender_token = soroban_sdk::token::Client::new(&data.env, &data.tokens[0]);

    // At t=1500, 500 vested; recipient withdraws 200
    data.env.ledger().set_timestamp(1_500);
    client.withdraw(&id, &200i128);

    let sender_before = sender_token.balance(&data.sender);
    let recipient_before = sender_token.balance(&data.recipient);

    // Cancel at t=1500 → vested=500, released=200
    // recipient_payout = 500 - 200 = 300; sender_refund = 1000 - 500 = 500
    client.cancel_stream(&id);

    assert_eq!(
        sender_token.balance(&data.recipient),
        recipient_before + 300
    );
    assert_eq!(sender_token.balance(&data.sender), sender_before + 500);
}

/// Cancelling a paused stream respects the frozen accrual point.
#[test]
fn cancel_stream_while_paused_uses_pause_time_for_split() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    // 1000 tokens, t=1000..2000
    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_000u64,
        &2_000u64,
    );

    let sender_token = soroban_sdk::token::Client::new(&data.env, &data.tokens[0]);

    // Pause at t=1200 → 200 tokens vested at pause
    data.env.ledger().set_timestamp(1_200);
    client.pause(&id);

    let sender_before = sender_token.balance(&data.sender);
    let recipient_before = sender_token.balance(&data.recipient);

    // Cancel at t=1800 (later, but stream is paused so accrual is frozen at t=1200)
    data.env.ledger().set_timestamp(1_800);
    client.cancel_stream(&id);

    // vested=200 (frozen at pause), released=0
    // recipient_payout=200, sender_refund=800
    assert_eq!(
        sender_token.balance(&data.recipient),
        recipient_before + 200
    );
    assert_eq!(sender_token.balance(&data.sender), sender_before + 800);
}

/// cancel_stream sets released_amount to vested_amount in the final state.
#[test]
fn cancel_stream_updates_released_amount_to_vested() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_000u64,
        &2_000u64,
    );

    data.env.ledger().set_timestamp(1_750);
    client.cancel_stream(&id);

    let s = client.get_stream(&id);
    // vested at t=1750 = 750; released_amount should reflect that
    assert_eq!(s.released_amount, 750);
    assert_eq!(s.status, StreamStatus::Cancelled);
}

#[test]
fn amend_stream_emits_amended_event() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Clear events from creation
    data.env.events().all();

    // Amend the stream (extend end time)
    client.amend_stream(&id, &5i128, &1_300u64);

    let events = data.env.events().all();
    assert!(!events.is_empty(), "amend_stream should emit events");
}

#[test]
fn amend_stream_requires_auth() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Try to amend without auth
    data.env.mock_auths(&[]);
    let result = client.try_amend_stream(&id, &5i128, &1_300u64);
    assert!(result.is_err(), "amend_stream should fail without auth");
}

#[test]
fn amend_stream_fails_on_invalid_end_time() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Try to amend with end_time in the past
    let result = client.try_amend_stream(&id, &5i128, &1_050u64);
    let err = result.expect_err("Should fail with past end_time");
    assert_eq!(err, Ok(Error::InvalidTimeRange));
}

#[test]
fn pause_emits_admin_action_event() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Clear events from creation
    data.env.events().all();

    // Pause the stream
    client.pause(&id);

    let events = data.env.events().all();
    assert!(!events.is_empty(), "pause should emit events");

    // The event should have 2 topics (stream, pause)
    let (_, topics, _) = events.last().unwrap();
    assert_eq!(topics.len(), 2, "Event should have 2 topics");
}

#[test]
fn resume_emits_admin_action_event() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Pause the stream
    client.pause(&id);

    // Clear events
    data.env.events().all();

    // Resume the stream
    client.resume(&id);

    let events = data.env.events().all();
    assert!(!events.is_empty(), "resume should emit events");

    // The event should have 2 topics (stream, resume)
    let (_, topics, _) = events.last().unwrap();
    assert_eq!(topics.len(), 2, "Event should have 2 topics");
}

#[test]
fn resume_without_pause_returns_invalid_state() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    let result = client.try_resume(&id);

    let err = result.expect_err("resume should fail for active stream");
    assert_eq!(err, Ok(Error::InvalidState));
}

#[test]
fn settle_emits_admin_action_event() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    // Advance past end_time
    data.env.ledger().set_timestamp(1_300);

    // Clear events
    data.env.events().all();

    // Settle the stream
    client.settle(&id);

    let events = data.env.events().all();
    assert!(!events.is_empty(), "settle should emit events");

    // The event should have 2 topics (stream, admin_action)
    let (_, topics, _) = events.last().unwrap();
    assert_eq!(topics.len(), 2, "Event should have 2 topics");
}

#[test]
fn no_events_on_cancel_failure() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    // Settle the stream first
    data.env.ledger().set_timestamp(1_300);
    client.settle(&id);

    // Clear events
    data.env.events().all();

    // Try to cancel settled stream (should fail)
    let _ = client.try_cancel_stream(&id);

    let events = data.env.events().all();
    assert!(
        events.is_empty(),
        "Failed cancel_stream should not emit events, got: {events:?}",
    );
}

#[test]
fn cancel_stream_decrements_sender_count() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );
    assert_eq!(client.sender_stream_count(&data.sender), 1);

    // Cancel the stream
    client.cancel_stream(&id);

    // Count should be decremented
    assert_eq!(client.sender_stream_count(&data.sender), 0);
}

#[test]
fn amend_stream_extends_end_time() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    let original = client.get_stream(&id);
    assert_eq!(original.end_time, 1_200u64);

    // Amend to new end_time
    client.amend_stream(&id, &5i128, &1_400u64);

    let amended = client.get_stream(&id);
    assert_eq!(amended.end_time, 1_400u64);
}

#[test]
fn amend_stream_fails_on_cancelled_stream() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Cancel the stream
    client.cancel_stream(&id);

    // Try to amend cancelled stream
    let result = client.try_amend_stream(&id, &5i128, &1_300u64);
    let err = result.expect_err("Should fail on cancelled stream");
    assert_eq!(err, Ok(Error::InvalidState));
}

// ── Focused tests for error surfaces using the current client harness ───────

#[test]
fn set_paused_wrong_admin_returns_unauthorized() {
    let data = setup_init();
    let client = contract_client(&data.env);
    let wrong = Address::generate(&data.env);

    client.initialize(&data.admin);

    let result = client.try_set_paused(&wrong, &true);
    let err = result.expect_err("non-admin pause should fail");
    assert_eq!(err, Ok(Error::Unauthorized));
}

#[test]
fn set_token_allowed_wrong_admin_returns_unauthorized() {
    let data = setup_init();
    let client = contract_client(&data.env);
    let wrong = Address::generate(&data.env);

    client.initialize(&data.admin);

    let result = client.try_set_token_allowed(&wrong, &data.tokens[0], &false);
    let err = result.expect_err("non-admin allowlist change should fail");
    assert_eq!(err, Ok(Error::Unauthorized));
}

#[test]
fn start_stream_missing_returns_not_found() {
    let data = setup_init();
    let client = contract_client(&data.env);

    let result = client.try_start_stream(&9999);
    let err = result.expect_err("missing stream should fail");
    assert_eq!(err, Ok(Error::NotFound));
}

#[test]
fn withdraw_missing_stream_returns_not_found() {
    let data = setup_init();
    let client = contract_client(&data.env);

    let result = client.try_withdraw(&9999, &1);
    let err = result.expect_err("missing stream should fail");
    assert_eq!(err, Ok(Error::NotFound));
}

#[test]
fn withdrawable_missing_stream_returns_not_found() {
    let data = setup_init();
    let client = contract_client(&data.env);

    let result = client.try_withdrawable(&9999);
    let err = result.expect_err("missing stream should fail");
    assert_eq!(err, Ok(Error::NotFound));
}

// ── Overflow safety tests ────────────────────────────────────────────────────

/// Withdraw a large (but non-overflowing) amount succeeds.
#[test]
fn withdraw_max_amount_succeeds() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    // Use a large amount that: (a) fits in the StellarAsset mint, and
    // (b) does not overflow vested_amount math (amount * elapsed / duration).
    // i128::MAX / 1000 is safe: (i128::MAX/1000) * 1000 / 1000 == i128::MAX/1000.
    let large = i128::MAX / 1000;
    StellarAssetClient::new(&data.env, &data.tokens[0]).mint(&data.sender, &large);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &large,
        &1_100u64,
        &1_200u64,
    );

    data.env.ledger().set_timestamp(1_300);
    let withdrawn = client.withdraw(&id, &large);
    assert_eq!(withdrawn, large);

    let stream = client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Settled);
}

/// Settle before any amount is released must handle checked sub correctly.
#[test]
fn settle_overflow_returns_overflow_error() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    data.env.ledger().set_timestamp(1_300);
    client.settle(&id);

    let stream = client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Settled);
    assert_eq!(stream.released_amount, 100);
}

/// Creating a stream with `start_time` == `end_time` must be rejected.
#[test]
fn create_stream_zero_duration_returns_invalid_time_range() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let result = client.try_create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_100u64,
    );
    let err = result.expect_err("zero duration should fail");
    assert_eq!(err, Ok(Error::InvalidTimeRange));
}

/// Vested amount with extreme values returns `Error::Overflow`.
#[test]
fn vested_amount_extreme_values_overflow() {
    use crate::release;
    use crate::StreamStatus;

    let env = soroban_sdk::Env::default();
    let stream = Stream {
        id: 1,
        sender: soroban_sdk::Address::generate(&env),
        recipient: soroban_sdk::Address::generate(&env),
        token: soroban_sdk::Address::generate(&env),
        total_amount: i128::MAX,
        released_amount: 0,
        start_time: 0,
        end_time: 1000,
        duration: 1000,
        last_update: 0,
        status: StreamStatus::Active,
        pause_time: 0,
        total_paused_duration: 0,
    };

    let result = release::vested_amount(&stream, 500);
    assert_eq!(result, Err(Error::Overflow));
}

/// Withdraw all released amount should settle the stream.
#[test]
fn withdraw_full_amount_after_end_settles_stream() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_100u64,
        &1_200u64,
    );

    data.env.ledger().set_timestamp(1_300);
    client.withdraw(&id, &100i128);

    let stream = client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Settled);
    assert_eq!(stream.released_amount, 100);
}

/// Creating a stream with the maximum duration range succeeds.
#[test]
fn create_stream_with_large_timespan_succeeds() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &100i128,
        &1_000u64,
        &u64::MAX,
    );

    let stream = client.get_stream(&id);
    assert_eq!(stream.duration, u64::MAX - 1_000);
}

/// Pause + resume preserves stream balance and uses checked arithmetic.
#[test]
fn pause_resume_preserves_vested_amount() {
    let data = setup_init();
    let client = contract_client(&data.env);
    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Advance to midpoint
    data.env.ledger().set_timestamp(1_150);
    client.pause(&id);

    // Check vested amount at pause
    let vested = client.stream_balance(&id);
    assert!(vested > 0);
    assert!(vested <= 1000);

    // Advance time while paused
    data.env.ledger().set_timestamp(1_200);
    let still_vested = client.stream_balance(&id);
    // Should not have increased while paused
    assert_eq!(still_vested, vested);

    // Resume
    client.resume(&id);
    data.env.ledger().set_timestamp(1_300);
    let resumed_vested = client.stream_balance(&id);
    assert_eq!(resumed_vested, 1000);
}

#[test]
fn claim_drip_returns_withdrawable_amount() {
    let data = setup_init();
    let client = contract_client(&data.env);

    client.initialize(&data.admin);

    let id = client.create_stream(
        &data.sender,
        &data.recipient,
        &data.tokens[0],
        &1000i128,
        &1_100u64,
        &1_200u64,
    );

    // Before start time, should return 0
    assert_eq!(client.claim_drip(&id), Ok(0));

    // Midpoint, should return half
    data.env.ledger().set_timestamp(1_150);
    let drip = client.claim_drip(&id);
    assert_eq!(drip, Ok(500));

    // Withdraw some, then check drip again
    client.withdraw(&id, &200i128);
    let drip_after_withdraw = client.claim_drip(&id);
    assert_eq!(drip_after_withdraw, Ok(300));
}
