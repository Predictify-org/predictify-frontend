//! Stream storage primitives.
//!
//! This module owns the on-chain shape of a single `StreamInfo` record and
//! the small set of helpers used by `lib.rs` to read, write and bump the TTL
//! on that record. Keeping the storage layer here makes the entry-point
//! contract in `lib.rs` easier to read and audit.
//!
//! Storage layout:
//!
//! - Persistent: `("stream", stream_id) -> StreamInfo`
//!
//! See `docs/storage-layout.md` for the full layout including the instance
//! counter and event topics.

use soroban_sdk::{contracttype, Address, Env, Symbol};

/// TTL threshold: extend when remaining TTL drops below ~1 day (17_280 ledgers at ~5s each).
pub const STREAM_TTL_THRESHOLD: u32 = 17_280;
/// TTL extend-to: refresh to ~30 days (518_400 ledgers).
pub const STREAM_TTL_EXTEND: u32 = 518_400;

/// On-chain representation of a payment stream.
///
/// Stored under `("stream", stream_id)` in persistent storage. All time fields
/// are Unix seconds derived from `Env::ledger().timestamp()`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct StreamInfo {
    /// Account that funded the stream and retains ownership of the escrowed balance.
    pub payer: Address,
    /// Account entitled to receive accrued tokens once they are settled.
    pub recipient: Address,
    /// Tokens streamed per whole second. Must be strictly positive at creation.
    pub rate_per_second: i128,
    /// Tokens still held in escrow for this stream (not yet earned).
    pub balance: i128,
    /// Unix seconds when the stream was started; `0` means it has not started yet.
    pub start_time: u64,
    /// Unix seconds when accrual stops; `0` means "no time limit".
    pub end_time: u64,
    /// Whether the stream is currently accruing. Toggled by start/stop.
    pub is_active: bool,
}

/// Build the persistent storage key used for the given stream id.
///
/// All access to a stream's `StreamInfo` MUST go through this helper so that
/// the (`Symbol`, `u32`) tuple shape stays consistent across the contract.
pub fn stream_key(env: &Env, stream_id: u32) -> (Symbol, u32) {
    (Symbol::new(env, "stream"), stream_id)
}

/// Load a `StreamInfo` from persistent storage.
///
/// Panics with `"stream not found"` if no entry exists for the id, which can
/// happen if the stream was archived or never created.
pub fn get_stream(env: &Env, stream_id: u32) -> StreamInfo {
    let key = stream_key(env, stream_id);
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic!("stream not found"))
}

/// Persist `info` under the canonical key for `stream_id`.
///
/// Callers should also invoke [`extend_stream_ttl`] after mutating a stream
/// so its persistent entry does not expire prematurely.
pub fn set_stream(env: &Env, stream_id: u32, info: &StreamInfo) {
    let key = stream_key(env, stream_id);
    env.storage().persistent().set(&key, info);
}

/// Bump the TTL of a stream's persistent entry to roughly 30 days.
///
/// Should be called after any read/write to keep frequently used streams from
/// being archived by the network's storage GC.
pub fn extend_stream_ttl(env: &Env, stream_id: u32) {
    let key = stream_key(env, stream_id);
    env.storage()
        .persistent()
        .extend_ttl(&key, STREAM_TTL_THRESHOLD, STREAM_TTL_EXTEND);
}