//! # Storage helpers
//!
//! All reads/writes to the ledger go through this module so the rest of the
//! contract never touches raw `env.storage()` calls directly.
//!
//! ## Key layout
//!
//! ```text
//! instance()   → DataKey::Admin        – Address
//! instance()   → DataKey::StreamCount  – u64
//! persistent() → DataKey::Stream(u64)  – Stream
//! ```

use soroban_sdk::{contracttype, Address, Env};

// ── Types ─────────────────────────────────────────────────────────────────────

/// Status of a payment stream.
///
/// Mirrors `ContractStreamStatus` in `types.ts`.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum StreamStatus {
    /// Created but not yet funded / activated.
    Draft,
    /// Tokens are flowing to the recipient.
    Active,
    /// Temporarily halted; can be resumed.
    Paused,
    /// All tokens have been released to the recipient.
    Settled,
    /// Stream reached its `end_time` naturally.
    Ended,
    /// Cancelled by the sender before completion.
    Cancelled,
}

/// Core payment-stream record stored on chain.
///
/// Mirrors `OnChainStream` in `types.ts` with additional fields required by
/// the contract (token address, time bounds, sender).
#[contracttype]
#[derive(Clone, Debug)]
pub struct Stream {
    /// The address that created and funds this stream.
    pub sender: Address,
    /// The address that receives streamed tokens.
    pub recipient: Address,
    /// The Stellar asset contract address being streamed.
    pub token: Address,
    /// Total amount of `token` (in stroops / base units) locked in the stream.
    pub total_amount: i128,
    /// Amount already released to `recipient`.
    pub released_amount: i128,
    /// Ledger timestamp when the stream starts (seconds since Unix epoch).
    pub start_time: u64,
    /// Ledger timestamp when the stream ends.
    pub end_time: u64,
    /// Ledger timestamp of the last settlement calculation.
    pub last_update: u64,
    /// Current lifecycle status.
    pub status: StreamStatus,
}

/// Ledger storage keys used by this contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Administrator address – stored in `instance()`.
    Admin,
    /// Monotonic counter of streams ever created – stored in `instance()`.
    StreamCount,
    /// Individual stream record keyed by its numeric ID – stored in `persistent()`.
    Stream(u64),
}

// ── Admin (instance storage) ──────────────────────────────────────────────────

/// Return `true` if an admin has already been recorded.
pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

/// Write the admin address to instance storage.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Read the admin address from instance storage.
///
/// # Panics
/// Panics if the contract has not been initialised yet.
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("contract not initialised")
}

// ── Stream counter (instance storage) ────────────────────────────────────────

/// Write the stream counter to instance storage.
pub fn set_stream_count(env: &Env, count: u64) {
    env.storage().instance().set(&DataKey::StreamCount, &count);
}

/// Read the stream counter from instance storage (defaults to 0).
pub fn get_stream_count(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::StreamCount)
        .unwrap_or(0u64)
}

/// Increment the stream counter and return the **new** ID to use.
///
/// The counter starts at 0; the first stream gets ID 0, the second gets 1, …
pub fn next_stream_id(env: &Env) -> u64 {
    let id = get_stream_count(env);
    set_stream_count(env, id + 1);
    id
}

// ── Stream records (persistent storage) ──────────────────────────────────────

/// Return `true` if a stream with `id` exists in persistent storage.
pub fn stream_exists(env: &Env, id: u64) -> bool {
    env.storage().persistent().has(&DataKey::Stream(id))
}

/// Write a stream record to persistent storage.
pub fn set_stream(env: &Env, id: u64, stream: &Stream) {
    env.storage()
        .persistent()
        .set(&DataKey::Stream(id), stream);
}

/// Read a stream record from persistent storage, returning `None` if absent.
pub fn get_stream(env: &Env, id: u64) -> Option<Stream> {
    env.storage().persistent().get(&DataKey::Stream(id))
}
