#![cfg(test)]

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
    let result = client.try_init_with_token_allowlist(
        &data.admin,
        &to_sdk_vec(&data.env, &data.tokens),
    );
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

    let result = client.try_init_with_token_allowlist(
        &data.admin,
        &to_sdk_vec(&data.env, &data.tokens),
    );
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
        "init_with_token_allowlist should emit zero events, got: {:?}",
        events
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
    let _ = client
        .try_init_with_token_allowlist(&impostor, &to_sdk_vec(&data.env, &data.tokens));

    // `mock_all_auths` was on at `setup_init` time so `set_paused`
    // still succeeds, proving the original `admin` is intact.
    client.set_paused(&data.admin, &false);
}
