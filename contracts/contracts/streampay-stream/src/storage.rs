//! # Contract storage layout
//!
//! All persistent state for the `StreamPay` contract is keyed by
//! [`DataKey`]. There are two storage tiers in use:
//!
//! - **Instance storage** holds singletons: `Admin`, `Paused`, the
//!   stream counter, and the per-token allowlist. These keys live for
//!   the lifetime of the contract instance and are extended together.
//! - **Persistent storage** holds per-stream rows keyed by stream id.
//!   These rows are TTL-extended every time the stream is read or
//!   written so an active stream cannot expire mid-flight.
//!
//! The TTL constants below are tuned for long-running payment streams
//! plus a generous recovery buffer; keep them in sync with the
//! operational runbook.

use soroban_sdk::{contracttype, Address, Env};

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum StreamStatus {
    Draft,
    Active,
    Paused,
    Settled,
    Ended,
    Cancelled,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Stream {
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub duration: u64,
    pub last_update: u64,
    pub status: StreamStatus,
    pub pause_time: u64,
    pub total_paused_duration: u64,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Paused,
    StreamCount,
    Stream(u64),
    TokenAllowed(Address),
}

/// Threshold and absolute target values are expressed in ledger sequences.
///
/// The stream TTL helper extends the stored stream entry to a rolling multi-
/// week horizon, while the instance TTL helper preserves admin and counter
/// keys used by contract governance and stream creation.
///
/// These constants are tuned for long-running payments, with a buffer to keep
/// active streams alive across the full start..end window plus recovery time.
pub const STREAM_TTL_MIN_REMAINING: u32 = 120_960; // ~1 week at 5s ledgers
pub const STREAM_TTL_EXTEND_TO: u32 = 483_840; // ~4 weeks at 5s ledgers
pub const INSTANCE_TTL_MIN_REMAINING: u32 = 43_200; // ~2.5 days
pub const INSTANCE_TTL_EXTEND_TO: u32 = 120_960; // ~1 week

fn ttl_target(env: &Env, extra_ledgers: u32) -> u32 {
    env.ledger().sequence().saturating_add(extra_ledgers)
}

fn extend_persistent_ttl(env: &Env, key: &DataKey) {
    // In soroban-sdk 23.x, get_ttl is only available via testutils and the
    // extend_ttl call itself short-circuits when the key's TTL is already
    // above the threshold. We therefore call extend_ttl unconditionally
    // with the minimum remaining TTL as the threshold.
    let threshold = env
        .ledger()
        .sequence()
        .saturating_add(STREAM_TTL_MIN_REMAINING);
    let target = ttl_target(env, STREAM_TTL_EXTEND_TO);
    env.storage()
        .persistent()
        .extend_ttl(key, threshold, target);
}

fn extend_instance_ttl(env: &Env, _key: &DataKey) {
    // Instance storage in soroban-sdk 23.x does not accept a key argument
    // to extend_ttl; the host function extends the entire current contract
    // instance. The call short-circuits internally when the instance TTL
    // already exceeds the threshold.
    let threshold = env
        .ledger()
        .sequence()
        .saturating_add(INSTANCE_TTL_MIN_REMAINING);
    let target = ttl_target(env, INSTANCE_TTL_EXTEND_TO);
    env.storage().instance().extend_ttl(threshold, target);
}

fn extend_stream_ttl(env: &Env, stream_id: u64) {
    extend_persistent_ttl(env, &DataKey::Stream(stream_id));
}

fn extend_admin_key_ttl(env: &Env) {
    extend_instance_ttl(env, &DataKey::Admin);
}

fn extend_pause_key_ttl(env: &Env) {
    extend_instance_ttl(env, &DataKey::Paused);
}

fn extend_next_stream_id_ttl(env: &Env) {
    extend_instance_ttl(env, &DataKey::StreamCount);
}

/// Returns whether an admin key is present in instance storage.
///
/// If the admin key exists, this helper extends its TTL to ensure the
/// governance address does not expire mid-flight.
///
/// # Returns
/// - `true` if [`DataKey::Admin`] exists.
/// - `false` otherwise.
///
/// # Errors
/// This helper does not return errors.
pub fn has_admin(env: &Env) -> bool {
    let exists = env.storage().instance().has(&DataKey::Admin);
    if exists {
        extend_admin_key_ttl(env);
    }
    exists
}

/// Sets the contract admin address in instance storage.
///
/// This helper also extends the admin key TTL.
///
/// # Returns
/// This helper does not return a value.
///
/// # Errors
/// This helper does not return errors.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
    extend_admin_key_ttl(env);
}

/// Returns the stored admin address, if any.
///
/// If an admin value exists, this helper extends its TTL.
///
/// # Returns
/// - `Some(Address)` if [`DataKey::Admin`] exists.
/// - `None` otherwise.
///
/// # Errors
/// This helper does not return errors.
pub fn get_admin(env: &Env) -> Option<Address> {
    let admin = env.storage().instance().get(&DataKey::Admin);
    if admin.is_some() {
        extend_admin_key_ttl(env);
    }
    admin
}

/// Sets the global paused flag in instance storage.
///
/// This helper also extends the paused key TTL.
///
/// # Returns
/// This helper does not return a value.
///
/// # Errors
/// This helper does not return errors.
pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
    extend_pause_key_ttl(env);
}

/// Returns whether the contract is currently paused.
///
/// If the paused key exists, this helper extends its TTL.
///
/// # Returns
/// - `true` if paused is set to `true`.
/// - `false` if paused is unset or set to `false`.
///
/// # Errors
/// This helper does not return errors.
pub fn is_paused(env: &Env) -> bool {
    let paused = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if env.storage().instance().has(&DataKey::Paused) {
        extend_pause_key_ttl(env);
    }
    paused
}

/// Sets whether a given token is allowed for future stream creation.
///
/// Tokens are allowed by default when there is no entry for the token. When
/// `allowed = false`, the function writes a deny entry that makes the token
/// “blocked” for future stream creation.
///
/// # Returns
/// This helper does not return a value.
///
/// # Errors
/// This helper does not return errors.
pub fn set_token_allowed(env: &Env, token: &Address, allowed: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::TokenAllowed(token.clone()), &allowed);
}

/// Returns whether a given token is blocked.
///
/// This is the logical negation of `set_token_allowed(..., allowed = true)`.
/// If no allow entry exists, the token is treated as allowed (therefore not
/// blocked).
///
/// # Returns
/// - `true` if the token is explicitly blocked.
/// - `false` if explicitly allowed or unset.
///
/// # Errors
/// This helper does not return errors.
pub fn is_token_blocked(env: &Env, token: &Address) -> bool {
    match env
        .storage()
        .persistent()
        .get::<DataKey, bool>(&DataKey::TokenAllowed(token.clone()))
    {
        Some(allowed) => !allowed,
        None => false,
    }
}

/// Returns the next stream id and increments the stored counter.
///
/// Stream ids start at `1` when the counter is unset. This helper extends the
/// TTL of the stream id counter key.
///
/// # Returns
/// The stream id that should be assigned to the next created stream.
///
/// # Errors
/// This helper does not return errors.
pub fn next_stream_id(env: &Env) -> u64 {
    let storage = env.storage().instance();
    let id = storage.get(&DataKey::StreamCount).unwrap_or(1u64);
    storage.set(&DataKey::StreamCount, &id.saturating_add(1));
    extend_next_stream_id_ttl(env);
    id
}

/// Writes a stream record into persistent storage.
///
/// This helper also extends the TTL for the corresponding per-stream entry.
///
/// # Returns
/// This helper does not return a value.
///
/// # Errors
/// This helper does not return errors.
pub fn set_stream(env: &Env, stream_id: u64, stream: &Stream) {
    env.storage()
        .persistent()
        .set(&DataKey::Stream(stream_id), stream);
    extend_stream_ttl(env, stream_id);
}

/// Reads a stream record from persistent storage.
///
/// If the stream exists, this helper extends the TTL for the corresponding
/// per-stream entry.
///
/// # Returns
/// - `Some(Stream)` if the stream exists.
/// - `None` otherwise.
///
/// # Errors
/// This helper does not return errors.
pub fn get_stream(env: &Env, stream_id: u64) -> Option<Stream> {
    let stream = env.storage().persistent().get(&DataKey::Stream(stream_id));
    if stream.is_some() {
        extend_stream_ttl(env, stream_id);
    }
    stream
}

/// Peeks at the next stream ID without incrementing the counter.
///
/// This is used by pagination views to determine the upper bound for
/// stream enumeration. It does not extend TTL since it's a read-only
/// operation that doesn't need to keep the counter alive.
///
/// # Returns
/// The next stream ID that would be assigned. If no streams have been
/// created, returns `1`.
///
/// # Errors
/// This helper does not return errors.
pub fn peek_next_stream_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::StreamCount)
        .unwrap_or(1u64)
}

/// Test helper to set the next stream ID counter.
///
/// This is only available in test builds and is used by the views
/// module tests to set up specific test scenarios.
#[cfg(test)]
pub fn set_next_stream_id_for_test(env: &Env, id: u64) {
    env.storage().instance().set(&DataKey::StreamCount, &id);
}
