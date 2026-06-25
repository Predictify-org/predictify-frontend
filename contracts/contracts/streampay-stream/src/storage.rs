//! # Contract storage layout
//!
//! All persistent state for the StreamPay contract is keyed by
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

#[derive(Clone, Debug, Eq, PartialEq)]
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

/// The `Val` generic lets us move data between keys without knowing
/// the concrete value type at compile time — the old value is read as
/// a raw `Val` and written back under the new key with the same bytes.
use soroban_sdk::Val;

#[derive(Clone)]
#[contracttype]
pub(crate) enum DataKey {
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
    let target = ttl_target(env, STREAM_TTL_EXTEND_TO);
    let threshold = env.ledger().sequence().saturating_add(STREAM_TTL_MIN_REMAINING);
    env.storage().persistent().extend_ttl(key, threshold, target);
}

fn extend_instance_ttl(env: &Env) {
    let target = ttl_target(env, INSTANCE_TTL_EXTEND_TO);
    let threshold = env.ledger().sequence().saturating_add(INSTANCE_TTL_MIN_REMAINING);
    env.storage().instance().extend_ttl(threshold, target);
}

fn extend_stream_ttl(env: &Env, stream_id: u64) {
    extend_persistent_ttl(env, &DataKey::Stream(stream_id));
}

pub fn has_admin(env: &Env) -> bool {
    let exists = env.storage().instance().has(&DataKey::Admin);
    if exists {
        extend_instance_ttl(env);
    }
    exists
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
    extend_instance_ttl(env);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    let admin = env.storage().instance().get(&DataKey::Admin);
    if admin.is_some() {
        extend_instance_ttl(env);
    }
    admin
}

pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
    extend_instance_ttl(env);
}

pub fn is_paused(env: &Env) -> bool {
    let paused = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
    if env.storage().instance().has(&DataKey::Paused) {
        extend_instance_ttl(env);
    }
    paused
}

pub fn set_token_allowed(env: &Env, token: &Address, allowed: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::TokenAllowed(token.clone()), &allowed);
}

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

pub fn next_stream_id(env: &Env) -> u64 {
    let storage = env.storage().instance();
    let id = storage.get(&DataKey::StreamCount).unwrap_or(1u64);
    storage.set(&DataKey::StreamCount, &(id + 1));
    extend_instance_ttl(env);
    id
}

pub fn set_stream(env: &Env, stream_id: u64, stream: &Stream) {
    env.storage()
        .persistent()
        .set(&DataKey::Stream(stream_id), stream);
    extend_stream_ttl(env, stream_id);
}

pub fn get_stream(env: &Env, stream_id: u64) -> Option<Stream> {
    let stream = env.storage().persistent().get(&DataKey::Stream(stream_id));
    if stream.is_some() {
        extend_stream_ttl(env, stream_id);
    }
    stream
}

/// Migrate an instance-storage key by reading the value under `old`,
/// writing it under `new`, and removing `old`. Returns `true` if a value
/// was migrated, `false` if the old key did not exist.
///
/// Uses `Val` as an intermediate to avoid requiring the concrete value
/// type — the stored XDR bytes are preserved verbatim.
pub fn migrate_instance_key(env: &Env, old: &DataKey, new: &DataKey) -> bool {
    if !env.storage().instance().has(old) {
        return false;
    }
    let val: Option<Val> = env.storage().instance().get(old);
    match val {
        Some(v) => {
            env.storage().instance().set(new, &v);
            env.storage().instance().remove(old);
            true
        }
        None => false,
    }
}

/// Migrate a persistent-storage key by reading the value under `old`,
/// writing it under `new`, and removing `old`. Returns `true` if a value
/// was migrated, `false` if the old key did not exist.
pub fn migrate_persistent_key(env: &Env, old: &DataKey, new: &DataKey) -> bool {
    if !env.storage().persistent().has(old) {
        return false;
    }
    let val: Option<Val> = env.storage().persistent().get(old);
    match val {
        Some(v) => {
            env.storage().persistent().set(new, &v);
            env.storage().persistent().remove(old);
            true
        }
        None => false,
    }
}
