//! # Contract storage layout
//!
//! This module owns every read and write to on-chain storage.  All other
//! modules in this crate go through the helpers defined here; nothing
//! outside this module calls `env.storage()` directly.  That single-entry-
//! point discipline means TTL extension, key construction, and type
//! serialisation are each enforced in one place.
//!
//! ## Storage tiers
//!
//! Soroban offers three storage tiers.  StreamPay uses two of them:
//!
//! ### Instance storage
//!
//! Instance storage is a map that is **scoped to the contract instance**.
//! All instance entries share a single TTL — the contract's own ledger-entry
//! expiry — so they live and expire together.  StreamPay stores four
//! singletons here:
//!
//! | Key | Type | Description |
//! |-----|------|-------------|
//! | `Admin` | `Address` | The privileged address authorised to call admin entrypoints. |
//! | `Paused` | `bool` | Global emergency-pause flag.  Absent == `false`. |
//! | `StreamCount` | `u64` | Monotonically increasing counter; next stream id = current value. |
//! | `TokenAllowed(Address)` | `bool` | Per-token allowlist entry.  Absent == allowed. |
//!
//! Instance keys are cheap to access because they colocate in the contract's
//! own ledger entry.  Because the TTL is shared, every instance-storage write
//! also calls [`extend_instance_ttl`] so the contract does not expire
//! while there are live streams.
//!
//! > **Note on `TokenAllowed`**: even though the value is keyed by an
//! > `Address`, it is stored in *instance* storage (not persistent) to keep
//! > governance data together and avoid the per-entry rent of persistent
//! > storage for what is typically a small, slowly-changing list.
//!
//! ### Persistent storage
//!
//! Persistent storage entries each have their **own independent TTL**.  A
//! stream row can therefore be kept alive for weeks without paying rent for
//! the much cheaper singletons.  StreamPay stores one family here:
//!
//! | Key | Type | Description |
//! |-----|------|-------------|
//! | `Stream(u64)` | [`Stream`] | Full stream record, keyed by the stream's numeric id. |
//!
//! Every call that reads or writes a `Stream` entry extends its TTL to
//! [`STREAM_TTL_EXTEND_TO`] ledgers in the future.  This rolling window
//! ensures an active stream cannot expire during its `start_time..end_time`
//! window given the constants below.
//!
//! ## Key naming conventions
//!
//! All keys are variants of the [`DataKey`] enum, which is annotated with
//! `#[contracttype]` so that Soroban serialises them as tagged XDR values.
//! The naming rules are:
//!
//! - **Singleton keys** (one value per contract) use a bare variant name:
//!   `Admin`, `Paused`, `StreamCount`.
//! - **Entity keys** (one value per entity) use a tuple variant whose inner
//!   value is the entity's primary identifier: `Stream(u64)`,
//!   `TokenAllowed(Address)`.
//!
//! Using a typed enum (rather than raw `symbol_short!` strings) means the
//! compiler rejects unknown keys at compile time and the XDR encoding is
//! deterministic and versioned.
//!
//! ## TTL strategy
//!
//! TTL thresholds are expressed in ledger sequences.  At the Stellar
//! mainnet target of ~5 s per ledger:
//!
//! | Constant | Value | Approximate wall time |
//! |----------|-------|-----------------------|
//! | [`STREAM_TTL_MIN_REMAINING`] | 120 960 | 1 week |
//! | [`STREAM_TTL_EXTEND_TO`] | 483 840 | 4 weeks |
//! | [`INSTANCE_TTL_MIN_REMAINING`] | 43 200 | 2.5 days |
//! | [`INSTANCE_TTL_EXTEND_TO`] | 120 960 | 1 week |
//!
//! The `MIN_REMAINING` threshold is the guard: if the entry's TTL still has
//! at least this many ledgers left, the host short-circuits the extension and
//! does not charge extra fees.  The `EXTEND_TO` target is the absolute ledger
//! sequence to extend to (not a delta), computed relative to the current
//! sequence at call time.
//!
//! Stream entries use a much larger window than instance entries because a
//! stream may run for weeks or months and must remain readable and writable
//! throughout its lifetime.
//!
//! ## Security notes
//!
//! - All mutating helpers in this module are `pub(crate)` or crate-internal.
//!   Callers in `lib.rs` are responsible for performing auth checks
//!   (`require_auth`, `require_admin`) **before** calling these helpers.
//! - Stream ids are issued by [`next_stream_id`] using a counter that starts
//!   at 1 and never reuses a value.  Callers must not construct `DataKey::Stream`
//!   directly; use the helpers to ensure TTL extension is always applied.
//! - The `TokenAllowed` entry uses the *absence* of an entry as the default-
//!   allow sentinel.  This means a freshly deployed contract allows all tokens
//!   until the admin explicitly blocks one.  The block list is checked in
//!   `is_token_blocked`, which returns `false` on absent keys.
//!
//! ## See also
//!
//! - [`crate::error`] — error codes returned when storage lookups fail.
//! - [`crate::events`] — events emitted after successful state mutation.
//! - The `## Storage layout` section in `README.md` for a human-readable
//!   summary and links back to this module.

use soroban_sdk::{contracttype, Address, Env};

/// Lifecycle state for a payment stream.
///
/// Transitions follow a directed graph; not every transition is valid.  The
/// contract enforces allowed transitions in `lib.rs`; see the entrypoint docs
/// for the exact guard conditions.
///
/// ```text
/// Draft ──start_stream──► Active ──pause──► Paused
///                         │  ▲                │
///                         │  └────resume───────┘
///                         │
///                         ├──withdraw (full)──► Settled
///                         ├──settle (expired)──► Settled
///                         └──cancel_stream──────► Cancelled
/// ```
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum StreamStatus {
    /// Stream has been funded but `start_stream` has not been called yet.
    /// No accrual occurs.  The sender may call `start_stream` to activate
    /// or `cancel_stream` to reclaim the escrowed funds.
    Draft,
    /// Stream is running.  Accrual proceeds linearly from `start_time`
    /// toward `end_time`.  The recipient may call `withdraw` at any time.
    Active,
    /// Stream accrual is frozen.  The sender has called `pause`.  Vested
    /// funds remain withdrawable but the vested amount does not increase
    /// until `resume` is called.  `end_time` is extended on resume to
    /// compensate for the frozen period.
    Paused,
    /// All funds have been released to the recipient.  This is a terminal
    /// state; no further mutations are allowed.
    Settled,
    /// Reserved for future use (early termination path).  Not currently
    /// reachable via any public entrypoint.
    Ended,
    /// The sender called `cancel_stream`.  Any unvested funds have been
    /// refunded to the sender.  This is a terminal state.
    Cancelled,
}

/// On-chain record for a single payment stream.
///
/// Stored in **persistent storage** under [`DataKey::Stream`].  Every field
/// is serialised by Soroban's XDR codec via `#[contracttype]`; field order
/// and types are part of the on-chain format and must not change without a
/// migration strategy.
#[derive(Clone, Debug)]
#[contracttype]
pub struct Stream {
    /// Unique, monotonically increasing numeric identifier.  Assigned by
    /// [`next_stream_id`] at creation time; starts at 1.
    pub id: u64,
    /// Address that funded the stream and holds administrative rights over
    /// it (pause, resume, cancel, start for draft streams).
    pub sender: Address,
    /// Address that accrues and may withdraw vested funds.
    pub recipient: Address,
    /// SEP-41 token contract address used for this stream.
    pub token: Address,
    /// Total token amount escrowed at stream creation.  This is the maximum
    /// amount that can ever be released to `recipient`.
    pub total_amount: i128,
    /// Cumulative token amount already transferred to `recipient`.
    /// Invariant: `released_amount <= total_amount`.
    pub released_amount: i128,
    /// Ledger timestamp at which accrual begins.  Zero for [`StreamStatus::Draft`]
    /// streams until `start_stream` is called.
    pub start_time: u64,
    /// Ledger timestamp at which accrual ends.  May be extended by `resume`
    /// to compensate for paused time.  Zero for draft streams.
    pub end_time: u64,
    /// Duration in ledger-timestamp seconds (`end_time - start_time` at
    /// activation).  Stored separately so draft streams can be activated at
    /// any future time while preserving the intended stream length.
    pub duration: u64,
    /// Ledger timestamp of the most recent state mutation (create, withdraw,
    /// pause, resume, settle, cancel).  Used by indexers to detect stale cache
    /// entries.
    pub last_update: u64,
    /// Current lifecycle state.  See [`StreamStatus`] for valid transitions.
    pub status: StreamStatus,
    /// Ledger timestamp at which the stream was most recently paused.
    /// Zero when the stream is not paused.  Used to compute elapsed paused
    /// time when `resume` is called.
    pub pause_time: u64,
    /// Cumulative number of ledger-timestamp seconds the stream has spent in
    /// [`StreamStatus::Paused`] state.  Subtracted from elapsed time in the
    /// accrual formula so paused time never counts toward vesting.
    pub total_paused_duration: u64,
}

/// Typed storage keys for the StreamPay contract.
///
/// Every read and write to `env.storage()` uses one of these variants so
/// that key construction, storage tier selection, and TTL extension are
/// centralised in this module.
///
/// The enum is annotated with `#[contracttype]` which instructs Soroban to
/// serialise each variant as a tagged XDR `ScVal`.  This gives deterministic,
/// versioned keys — mistyped or unknown keys are rejected at compile time.
///
/// ## Storage tier mapping
///
/// | Variant | Tier | Rationale |
/// |---------|------|-----------|
/// | [`Admin`] | Instance | Singleton; lives and dies with the contract instance. |
/// | [`Paused`] | Instance | Singleton boolean; cheap to keep in instance storage. |
/// | [`StreamCount`] | Instance | Singleton counter; must always be present when creating streams. |
/// | [`TokenAllowed`] | Instance | Small, slowly-changing allowlist; colocated with other governance data. |
/// | [`Stream`] | Persistent | One entry per stream; each has an independent TTL tuned to the stream duration. |
///
/// [`Admin`]: DataKey::Admin
/// [`Paused`]: DataKey::Paused
/// [`StreamCount`]: DataKey::StreamCount
/// [`TokenAllowed`]: DataKey::TokenAllowed
/// [`Stream`]: DataKey::Stream
#[derive(Clone)]
#[contracttype]
enum DataKey {
    /// Stores the admin [`Address`] in instance storage.
    ///
    /// Set once by `initialize` (or `init_with_token_allowlist`) and
    /// updated by `set_admin`.  Read by every admin-gated entrypoint.
    /// Absence means the contract has not been initialised.
    Admin,

    /// Stores the global pause flag (`bool`) in instance storage.
    ///
    /// `true` blocks all mutating, non-admin entrypoints.  Set by
    /// `set_paused`.  The helper [`is_paused`] returns `false` when
    /// this key is absent (i.e. the contract starts unpaused by default
    /// after `initialize` explicitly writes `false`).
    Paused,

    /// Stores the next-stream-id counter (`u64`) in instance storage.
    ///
    /// Initialised to `1` on the first call to [`next_stream_id`] (via
    /// `unwrap_or(1)`).  After each call the stored value is incremented
    /// so the next call gets a unique id.  Ids are never reused even if a
    /// stream is cancelled or settled.
    StreamCount,

    /// Stores a single [`crate::Stream`] record in persistent storage,
    /// keyed by the stream's numeric id.
    ///
    /// The key is `Stream(id)` where `id` is assigned by [`next_stream_id`].
    /// TTL is extended to [`STREAM_TTL_EXTEND_TO`] on every read and write
    /// so that active streams do not expire between their `start_time` and
    /// `end_time` windows.
    Stream(u64),

    /// Records whether a specific token contract is allowed for stream
    /// creation, stored in instance storage.
    ///
    /// The value is a `bool`: `true` = allowed, `false` = blocked.  **Absence
    /// of the key is treated as allowed** — the contract enforces a default-
    /// allow policy.  The admin calls `set_token_allowed(token, false)` to
    /// block a token, and `set_token_allowed(token, true)` to re-enable it.
    ///
    /// Checked in `create_stream` via [`is_token_blocked`], which returns
    /// `false` (not blocked) when the key is absent.
    TokenAllowed(Address),
}

/// Minimum TTL remaining (in ledger sequences) before a persistent stream
/// entry is extended.  If a stream entry still has more than this many
/// ledgers left, the host skips the extension and charges no extra fee.
/// Approximately 1 week at 5 s per ledger.
pub const STREAM_TTL_MIN_REMAINING: u32 = 120_960;

/// Target TTL (ledgers from now) to which a persistent stream entry is
/// extended on each read or write.  Approximately 4 weeks at 5 s per
/// ledger — long enough to cover the stream's active window plus a generous
/// recovery buffer.
pub const STREAM_TTL_EXTEND_TO: u32 = 483_840;

/// Minimum TTL remaining (in ledger sequences) before the contract instance
/// entry is extended.  Approximately 2.5 days at 5 s per ledger.
pub const INSTANCE_TTL_MIN_REMAINING: u32 = 43_200;

/// Target TTL (ledgers from now) to which the contract instance entry is
/// extended on each admin or counter operation.  Approximately 1 week at
/// 5 s per ledger.
pub const INSTANCE_TTL_EXTEND_TO: u32 = 120_960;

fn ttl_target(env: &Env, extra_ledgers: u32) -> u32 {
    env.ledger().sequence().saturating_add(extra_ledgers)
}

fn extend_persistent_ttl(env: &Env, key: &DataKey) {
    // In soroban-sdk 23.x, get_ttl is only available via testutils and the
    // extend_ttl call itself short-circuits when the key's TTL is already
    // above the threshold. We therefore call extend_ttl unconditionally
    // with the minimum remaining TTL as the threshold.
    let threshold = env.ledger().sequence().saturating_add(STREAM_TTL_MIN_REMAINING);
    let target = ttl_target(env, STREAM_TTL_EXTEND_TO);
    env.storage().persistent().extend_ttl(key, threshold, target);
}

fn extend_instance_ttl(env: &Env, _key: &DataKey) {
    // Instance storage in soroban-sdk 23.x does not accept a key argument
    // to extend_ttl; the host function extends the entire current contract
    // instance. The call short-circuits internally when the instance TTL
    // already exceeds the threshold.
    let threshold = env.ledger().sequence().saturating_add(INSTANCE_TTL_MIN_REMAINING);
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
    let paused = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
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
    storage.set(&DataKey::StreamCount, &(id + 1));
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

