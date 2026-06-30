//! # `StreamPay` Stream Contract
//!
//! Soroban smart contract that manages linear payment streams on Stellar.
//! Each stream locks a fixed token amount in escrow and releases it linearly
//! to a recipient over a configurable duration.
//!
//! ## Lifecycle
//!
//! ```text
//! Draft ──start_stream──► Active ──withdraw (full)──► Settled
//! ```
//!
//! ## Administrative controls
//!
//! A single admin address (set at [`Contract::initialize`]) may:
//! - Toggle the global emergency pause ([`Contract::set_paused`]).
//! - Allow or block individual token contracts ([`Contract::set_token_allowed`]).
#![no_std]

mod allowlist;
mod error;
mod events;
mod limits;
mod release;
mod storage;
mod views;

pub use error::Error;
use soroban_sdk::contracttype;
use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env};
pub use storage::{Stream, StreamStatus};
pub use views::{StreamPage, MAX_PAGE_SIZE};

/// The `StreamPay` contract entry point registered with the Soroban host.
#[contract]
pub struct Contract;

/// Ledger storage keys used internally by this contract.
///
/// Not exposed to callers; listed here for auditability.
#[derive(Clone)]
#[contracttype]
enum DataKey {
    /// The privileged admin [`Address`].
    Admin,
    /// Global emergency pause flag (`bool`).
    Paused,
    /// Monotonic counter; value is the **next** stream ID to assign.
    NextStreamId,
    /// Per-stream record keyed by numeric ID.
    Stream(u64),
    /// Per-token allowlist entry. Absent or `true` → allowed; `false` → blocked.
    TokenAllowed(Address),
}

#[allow(clippy::needless_pass_by_value, clippy::must_use_candidate)]
#[contractimpl]
impl Contract {
    /// One-time contract initialisation.
    ///
    /// Records `admin` as the privileged address for [`Contract::set_paused`]
    /// and [`Contract::set_token_allowed`]. Sets the global pause flag to
    /// `false`.
    ///
    /// # Parameters
    /// - `admin` — Address that will have admin privileges over this contract.
    /// Records `admin` as the privileged address for `set_paused` and
    /// `set_token_allowed`. Sets the global pause flag to `false`.
    ///
    /// # Errors
    /// - [`Error::AlreadyInitialized`] if the contract has already been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_paused(&env, false);
        Ok(())
    }

    /// Atomic initialisation + token allowlist.
    ///
    /// Performs the work of `initialize` and then marks each
    /// address in `tokens` as `allowed = true` in the per-token
    /// allowlist, all within a single transaction.
    ///
    /// Use this from deployment scripts so that the admin and the
    /// initial allowlist are committed together: either the whole
    /// configuration lands atomically or nothing does. Because
    /// Soroban rolls back all storage writes on failure, calling
    /// this on a contract that is already initialised (or with a
    /// caller that fails auth) leaves zero partial state.
    ///
    /// Tokens are allowed by default; explicitly writing
    /// `allowed = true` here is idempotent for tokens that are
    /// already allowed and has no effect on tokens that are
    /// subsequently blocked via `set_token_allowed`.
    ///
    /// # Arguments
    ///
    /// * `admin`  - The privileged address authorised to call
    ///   admin entrypoints (`set_paused`, `set_admin`,
    ///   `set_token_allowed`).
    /// * `tokens` - The list of token contract addresses to
    ///   register in the allowlist. May be empty if the contract
    ///   intends to stream the native asset or add tokens lazily
    ///   via `set_token_allowed` later.
    ///
    /// # Errors
    ///
    /// - `Error::AlreadyInitialized` if the contract has already been
    ///   initialised. The allowlist is *not* partially written.
    ///
    /// # Auth
    ///
    /// Requires authorisation from `admin`. Auth is consumed
    /// before any state mutation so that an auth failure cannot
    /// leave the contract half-configured.
    ///
    /// # See also
    ///
    /// - `initialize` - the legacy two-step path; still supported
    ///   for backward compatibility.
    /// - `set_token_allowed` - the per-token toggle used after
    ///   initialisation.
    pub fn init_with_token_allowlist(
        env: Env,
        admin: Address,
        tokens: soroban_sdk::Vec<Address>,
    ) -> Result<(), Error> {
        // Guard against double initialisation. We check *before* any
        // writes so that a previously-initialised contract cannot have
        // its allowlist silently mutated.
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }

        // Authorise the caller up-front. Soroban rolls back all
        // storage writes on auth failure, but collecting auth first
        // makes the atomicity guarantee obvious to reviewers and
        // mirrors the pattern used by `initialize`.
        admin.require_auth();

        // From this point on the transaction either commits all
        // writes or none of them - the host aborts and reverts on
        // any panic, so any failure below (none expected under
        // normal conditions) leaves the contract uninitialised.
        storage::set_admin(&env, &admin);
        storage::set_paused(&env, false);

        // Iterate the allowlist. `Vec::iter` returns an iterator
        // over the on-chain vector; each `set_token_allowed` call
        // writes a single persistent-storage entry.
        for token in tokens.iter() {
            storage::set_token_allowed(&env, &token, true);
        }

        Ok(())
    }

    /// Sets the global emergency pause flag.
    ///
    /// When `paused` is `true`, `create_stream`, `start_stream`, and `withdraw`
    /// all return [`Error::ContractPaused`]. Read-only calls (`get_stream`,
    /// `withdrawable`) are unaffected.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    /// - [`Error::NotFound`] if the contract has not been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        storage::set_paused(&env, paused);
        events::paused_set(&env, &admin, paused, env.ledger().timestamp());
        Ok(())
    }

    /// Transfers the admin role to a new address.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    ///
    /// # Auth
    /// Requires authorisation from current `admin`.
    pub fn set_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        storage::set_admin(&env, &new_admin);
        events::admin_changed(&env, &admin, &new_admin, env.ledger().timestamp());
        Ok(())
    }

    /// Allows or blocks a token for future stream creation.
    ///
    /// Tokens are allowed by default (no entry in storage). Setting
    /// `allowed = false` blocks the token; `allowed = true` re-enables it.
    /// Existing streams using a subsequently blocked token are unaffected.
    ///
    /// # Parameters
    /// - `admin`   — Must match the admin set at initialisation.
    /// - `token`   — Stellar asset contract address to configure.
    /// - `allowed` — `true` to allow; `false` to block.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    /// - [`Error::NotFound`] if the contract has not been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn set_token_allowed(
        env: Env,
        admin: Address,
        token: Address,
        allowed: bool,
    ) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        storage::set_token_allowed(&env, &token, allowed);
        events::token_allowed_set(&env, &admin, &token, allowed, env.ledger().timestamp());
        Ok(())
    }

    /// Configures the **per-organisation** token allowlist for `org`.
    ///
    /// This layers on top of the global allowlist ([`Contract::set_token_allowed`]):
    /// the first time an org is granted a token (`allowed = true`) the org
    /// switches to whitelist mode, after which any token the org has not
    /// explicitly allowed is blocked for that org's streams created via
    /// [`Contract::create_stream_for_org`]. Setting `allowed = false` records an
    /// explicit per-org block.
    ///
    /// # Parameters
    /// - `admin`   — Must match the admin set at initialisation.
    /// - `org`     — Organisation address the rule applies to.
    /// - `token`   — Token contract address being configured.
    /// - `allowed` — `true` to allow for this org; `false` to block.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    /// - [`Error::NotFound`] if the contract has not been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn set_org_token_allowed(
        env: Env,
        admin: Address,
        org: Address,
        token: Address,
        allowed: bool,
    ) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        allowlist::set_org_token_allowed(&env, &org, &token, allowed);
        Ok(())
    }

    /// Returns `true` if `token` is allowed for `org` under the per-org
    /// allowlist (read-only; also honours the global allowlist).
    pub fn is_org_token_allowed(env: Env, org: Address, token: Address) -> bool {
        !allowlist::is_org_token_blocked(&env, &org, &token)
            && !storage::is_token_blocked(&env, &token)
    }

    /// Creates a funded stream on behalf of `org`, enforcing the per-org token
    /// allowlist in addition to all the checks performed by
    /// [`Contract::create_stream`].
    ///
    /// `org` is the organisation the stream is attributed to; the per-org
    /// allowlist for `(org, token)` is consulted before the stream is created.
    ///
    /// # Errors
    /// In addition to every error of [`Contract::create_stream`]:
    /// - [`Error::TokenNotAllowed`] if `token` is blocked for `org` by the
    ///   per-org allowlist.
    ///
    /// # Auth
    /// Requires authorisation from `sender`.
    #[allow(clippy::too_many_arguments)]
    pub fn create_stream_for_org(
        env: Env,
        org: Address,
        sender: Address,
        recipient: Address,
        token: Address,
        total_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> Result<u64, Error> {
        // Per-org allowlist gate runs first so a blocked token is rejected
        // before any auth/escrow side effects in create_stream.
        if allowlist::is_org_token_blocked(&env, &org, &token) {
            return Err(Error::TokenNotAllowed);
        }

        Self::create_stream(
            env,
            sender,
            recipient,
            token,
            total_amount,
            start_time,
            end_time,
        )
    }

    /// Creates a funded stream and escrows `total_amount` from `sender`.
    ///
    pub fn set_max_streams_per_sender(env: Env, admin: Address, limit: u64) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        limits::set_max_streams_per_sender(&env, limit);
        Ok(())
    }

    /// Returns the current per-sender stream limit.
    pub fn max_streams_per_sender(env: Env) -> u64 {
        limits::get_max_streams_per_sender(&env)
    }

    /// Returns the number of active streams currently attributed to `sender`.
    pub fn sender_stream_count(env: Env, sender: Address) -> u64 {
        limits::get_sender_stream_count(&env, &sender)
    }

    /// Returns how many more streams `sender` may create before reaching the
    /// configured per-sender limit (`0` once the limit is reached).
    pub fn remaining_sender_capacity(env: Env, sender: Address) -> u64 {
        limits::remaining_sender_capacity(&env, &sender)
    }

    /// Creates a funded stream and escrows `total_amount` from `sender`.
    ///
    /// **Token transfer**: `total_amount` is transferred from `sender` to the
    /// contract address immediately, regardless of `draft`.
    ///
    /// If `draft = false` the stream is `Active` immediately with
    /// `start_time = now` and `end_time = now + duration`.
    /// If `draft = true` the stream is `Draft`; `start_time`, `end_time`, and
    /// `last_update` are all zero until [`Contract::start_stream`] is called.
    ///
    /// # Parameters
    /// - `sender`       — Address funding the stream; `total_amount` is pulled from here.
    /// - `recipient`    — Address that will receive streamed tokens.
    /// - `token`        — Stellar asset contract address to stream.
    /// - `total_amount` — Total tokens (base units) to lock in escrow. Must be > 0.
    /// - `duration`     — Stream length in seconds. Must be > 0.
    /// - `draft`        — `true` → create in `Draft` state; `false` → activate immediately.
    ///
    /// # Returns
    /// The numeric ID of the newly created stream.
    /// `last_update` are all zero until `start_stream` is called.
    ///
    /// Returns the new stream's numeric ID.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::InvalidAmount`] if `total_amount <= 0`.
    /// - [`Error::TokenNotAllowed`] if the token has been blocked by the admin.
    /// - [`Error::InvalidTimeRange`] if `duration == 0` or if
    ///   `now + duration` overflows `u64` (active streams only).
    /// - [`Error::StreamLimitExceeded`] if the sender already has the maximum
    ///   number of active streams.
    ///
    /// # Auth
    /// Requires authorisation from `sender`.
    /// Creates a funded active stream and escrows `total_amount` from `sender`.
    ///
    /// **Token transfer**: `total_amount` is transferred from `sender` to the
    /// contract address immediately.
    ///
    /// Returns the new stream's numeric ID.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::InvalidAmount`] if `total_amount <= 0`.
    /// - [`Error::SelfStream`] if `sender == recipient`.
    /// - [`Error::TokenNotAllowed`] if the token has been blocked by the admin.
    /// - [`Error::InvalidTimeRange`] if `end_time <= start_time` or `start_time < now`.
    ///
    /// # Auth
    /// Requires authorisation from `sender`.
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        total_amount: i128,
        start_time: u64,
        end_time: u64,
    ) -> Result<u64, Error> {
        require_not_paused(&env)?;
        sender.require_auth();
        limits::check_sender_limit(&env, &sender)?;

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if sender == recipient {
            return Err(Error::SelfStream);
        }

        if storage::is_token_blocked(&env, &token) {
            return Err(Error::TokenNotAllowed);
        }

        // Trustline pre-check: ensure the recipient can actually hold the token
        // before we lock funds in escrow. A recipient that cannot receive the
        // asset would otherwise leave funds stranded in the contract until the
        // stream is cancelled.
        require_recipient_trustline(&env, &token, &recipient)?;

        if end_time <= start_time {
            return Err(Error::InvalidTimeRange);
        }

        let now = env.ledger().timestamp();
        if start_time < now {
            return Err(Error::InvalidTimeRange);
        }

        let duration = end_time
            .checked_sub(start_time)
            .ok_or(Error::InvalidTimeRange)?;
        let id = storage::next_stream_id(&env);
        let contract_address = env.current_contract_address();

        token::Client::new(&env, &token).transfer(&sender, &contract_address, &total_amount);

        let stream = Stream {
            id,
            sender,
            recipient,
            token,
            total_amount,
            released_amount: 0,
            start_time,
            end_time,
            duration,
            last_update: start_time,
            status: StreamStatus::Active,
            pause_time: 0,
            total_paused_duration: 0,
        };

        storage::set_stream(&env, id, &stream);
        limits::increment_sender_stream_count(&env, &stream.sender);
        events::created(
            &env,
            id,
            &stream.sender,
            &stream.recipient,
            &stream.token,
            stream.total_amount,
            now,
        );

        Ok(id)
    }

    /// Activates a `Draft` stream, anchoring its time bounds to the current
    /// ledger timestamp.
    ///
    /// Sets `status = Active`, `start_time = now`, `last_update = now`, and
    /// `end_time = now + duration`. No token transfer occurs.
    ///
    /// # Parameters
    /// - `stream_id` — Numeric ID of the stream to activate.
    ///
    /// # Returns
    /// The updated [`Stream`] record after activation.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::InvalidState`] if the stream is not in `Draft` status.
    /// - [`Error::InvalidTimeRange`] if `now + duration` overflows `u64`.
    ///
    ///
    /// Sets `status = Active`, `start_time = now`, `last_update = now`, and
    /// `end_time = now + duration`. No token transfer occurs.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::InvalidState`] if the stream is not in `Draft` status.
    /// - [`Error::InvalidTimeRange`] if `now + duration` overflows `u64`.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `sender`.
    pub fn start_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        require_not_paused(&env)?;
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status != StreamStatus::Draft {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        stream.status = StreamStatus::Active;
        stream.start_time = now;
        stream.last_update = now;
        stream.end_time = now
            .checked_add(stream.duration)
            .ok_or(Error::InvalidTimeRange)?;

        storage::set_stream(&env, stream_id, &stream);
        events::started(
            &env,
            stream_id,
            stream.start_time,
            stream.end_time,
            stream.start_time,
        );

        Ok(stream)
    }

    /// Returns the stored stream record for `stream_id`.
    ///
    /// This is a read-only call and is never blocked by the pause flag.
    ///
    /// # Parameters
    /// - `stream_id` — Numeric ID of the stream to look up.
    ///
    /// # Returns
    /// The [`Stream`] record stored on-chain.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        get_existing_stream(&env, stream_id)
    }

    /// Returns the token amount currently accrued and available for withdrawal.
    ///
    /// Delegates to [`release::withdrawable`]. Returns `0` for `Draft` streams
    /// (accrual has not started) and for any stream in a non-`Active` state.
    ///
    /// This is a read-only call and is never blocked by the pause flag.
    ///
    /// # Parameters
    /// - `stream_id` — Numeric ID of the stream to query.
    ///
    /// # Returns
    /// Token amount (base units) available to withdraw right now.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Overflow`] if the vested-amount computation overflows.
    pub fn withdrawable(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        release::withdrawable(&stream, env.ledger().timestamp())
    }

    /// Returns the stream balance (vested amount) at a given ledger timestamp.
    ///
    /// This is a view function that computes how much of the stream has vested
    /// based on linear accrual from `start_time` to `end_time`. It uses overflow-safe
    /// checked arithmetic to ensure correctness even with large amounts.
    ///
    /// # Arguments
    ///
    /// * `stream_id` - The ID of the stream to query
    ///
    /// # Returns
    ///
    /// The vested amount as an i128, always in the range `[0, total_amount]`.
    /// Returns `Err(Error::Overflow)` if arithmetic overflows on extreme inputs.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Overflow`] if the vested-amount computation overflows.
    pub fn stream_balance(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        release::vested_amount(&stream, env.ledger().timestamp())
    }

    /// Withdraws `amount` of accrued tokens to the stream's `recipient`.
    ///
    /// **Token transfer**: `amount` is transferred from the contract address to
    /// `recipient`. If this brings `released_amount` to `total_amount` the
    /// stream transitions to [`StreamStatus::Settled`].
    ///
    /// # Parameters
    /// - `stream_id` — Numeric ID of the stream to withdraw from.
    /// - `amount`    — Token amount (base units) to withdraw. Must be > 0 and
    ///   ≤ the currently accrued withdrawable balance.
    ///
    /// # Returns
    /// The `amount` that was withdrawn on success.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::InvalidAmount`] if `amount <= 0`.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::AlreadySettled`] if the stream is already `Settled`.
    /// - [`Error::InvalidState`] if the stream is not `Active` (e.g. `Draft`
    ///   or `Cancelled`).
    /// - [`Error::OverWithdraw`] if `amount` exceeds the currently accrued
    ///   withdrawable balance.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `recipient`.
    pub fn withdraw(env: Env, stream_id: u64, amount: i128) -> Result<i128, Error> {
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.recipient.require_auth();

        if stream.status == StreamStatus::Settled {
            return Err(Error::AlreadySettled);
        }

        // Allow withdrawals from Active or Paused streams
        if stream.status != StreamStatus::Active && stream.status != StreamStatus::Paused {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        let available = release::withdrawable(&stream, now)?;
        if amount > available {
            return Err(Error::OverWithdraw);
        }

        stream.released_amount = stream
            .released_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        stream.last_update = now;

        if stream.released_amount == stream.total_amount {
            stream.status = StreamStatus::Settled;
            limits::decrement_sender_stream_count(&env, &stream.sender);
        }

        #[allow(clippy::needless_borrows_for_generic_args)]
        token::Client::new(&env, &stream.token).transfer(
            &env.current_contract_address(),
            &stream.recipient,
            &amount,
        );

        storage::set_stream(&env, stream_id, &stream);
        let ts = stream.last_update;
        events::withdrawn(&env, stream_id, &stream.recipient, amount, ts);
        if stream.status == StreamStatus::Settled {
            events::settled(&env, stream_id, &stream.recipient, stream.total_amount, ts);
        }

        Ok(amount)
    }

    // ── Private helpers ───────────────────────────────────────────────────────────

    /// Pauses an Active stream. Only the `sender` may pause.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `sender`.
    /// Pauses an active stream, freezing accrual while preserving vested funds.
    ///
    /// Only the stream sender may call this. On pause, status is set to Paused
    /// and `pause_time` is recorded. Vested amount remains withdrawable but does
    /// not increase while paused.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Unauthorized`] if caller is not the stream sender.
    /// - [`Error::InvalidState`] if the stream is not `Active`.
    pub fn pause(env: Env, stream_id: u64) -> Result<Stream, Error> {
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status != StreamStatus::Active {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        stream.pause_time = now;
        stream.last_update = now;
        stream.status = StreamStatus::Paused;

        storage::set_stream(&env, stream_id, &stream);

        events::paused(&env, stream_id, &stream.sender, stream.pause_time, now);

        Ok(stream)
    }

    /// Resumes a previously paused stream. Only the `sender` may resume.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `sender`.
    /// Resumes a paused stream, extending end_time to preserve unstreamed time.
    ///
    /// Only the stream sender may call this. On resume, the `end_time` is extended
    /// by the paused duration so the remaining streamable amount is preserved.
    /// Status is set back to Active.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Unauthorized`] if caller is not the stream sender.
    /// - [`Error::InvalidState`] if the stream is not `Paused`.
    /// - [`Error::InvalidTimeRange`] if time calculation overflows.
    pub fn resume(env: Env, stream_id: u64) -> Result<Stream, Error> {
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status != StreamStatus::Paused {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        let paused_duration = now
            .checked_sub(stream.pause_time)
            .ok_or(Error::InvalidTimeRange)?;

        // Track total paused duration for accrual calculations
        stream.total_paused_duration = stream
            .total_paused_duration
            .checked_add(paused_duration)
            .ok_or(Error::InvalidTimeRange)?;

        // Extend end_time by the paused duration to preserve unstreamed time
        stream.end_time = stream
            .end_time
            .checked_add(paused_duration)
            .ok_or(Error::InvalidTimeRange)?;

        stream.last_update = now;
        stream.status = StreamStatus::Active;
        stream.pause_time = 0;

        storage::set_stream(&env, stream_id, &stream);

        // Emit admin_action event for resume
        events::admin_action(
            &env,
            stream_id,
            &stream.sender,
            soroban_sdk::symbol_short!("resume"),
            now,
        );

        Ok(stream)
    }

    /// Finalizes a stream whose time window has fully elapsed, paying out
    /// any remaining vested funds to the recipient and transitioning it to a
    /// terminal `Settled` state.
    ///
    /// This function is permissionless and can be triggered by anyone after
    /// `end_time` has been reached. Calling it on an already `Settled` stream
    /// is a no-op (returns `Ok(())`).
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the contract is paused.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::InvalidState`] if the stream is in `Draft` or cancelled state,
    ///   or if the current ledger timestamp has not yet reached `end_time`.
    pub fn settle(env: Env, stream_id: u64) -> Result<(), Error> {
        require_not_paused(&env)?;
        let mut stream = get_existing_stream(&env, stream_id)?;

        if stream.status == StreamStatus::Settled {
            return Ok(());
        }

        if stream.status != StreamStatus::Active && stream.status != StreamStatus::Paused {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        if now < stream.end_time {
            return Err(Error::InvalidState);
        }

        let payout_amount = stream
            .total_amount
            .checked_sub(stream.released_amount)
            .ok_or(Error::Overflow)?;
        if payout_amount > 0 {
            #[allow(clippy::needless_borrows_for_generic_args)]
            token::Client::new(&env, &stream.token).transfer(
                &env.current_contract_address(),
                &stream.recipient,
                &payout_amount,
            );
            stream.released_amount = stream.total_amount;
        }

        stream.status = StreamStatus::Settled;
        stream.last_update = now;

        limits::decrement_sender_stream_count(&env, &stream.sender);
        storage::set_stream(&env, stream_id, &stream);
        events::admin_action(
            &env,
            stream_id,
            &stream.recipient,
            soroban_sdk::symbol_short!("settle"),
            now,
        );

        Ok(())
    }

    /// Cancels an active or paused stream with a correct sender/recipient refund split.
    ///
    /// At the moment of cancellation the stream's vested amount is computed. Funds
    /// are split as follows:
    ///
    /// - **Recipient** receives `vested_amount - released_amount` (accrued but
    ///   not yet withdrawn).
    /// - **Sender** receives `total_amount - vested_amount` (unvested / unstreamed).
    ///
    /// This preserves the invariant that the recipient is entitled to everything
    /// that has already vested, regardless of whether they have withdrawn it yet.
    ///
    /// The stream transitions to [`StreamStatus::Cancelled`] (terminal state).
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::InvalidState`] if the stream is already `Settled` or `Cancelled`.
    /// - [`Error::Overflow`] if any amount arithmetic overflows.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `sender`.
    pub fn cancel_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status == StreamStatus::Settled || stream.status == StreamStatus::Cancelled {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        let contract = env.current_contract_address();
        let token = token::Client::new(&env, &stream.token);

        // Compute vested amount at cancellation time (handles Active, Paused, Draft).
        // For Draft streams, vested = 0 so the full amount returns to sender.
        let vested = release::vested_amount(&stream, now)?;

        // Recipient is owed vested - already_released (may be 0).
        let recipient_payout = vested
            .checked_sub(stream.released_amount)
            .ok_or(Error::Overflow)?;

        // Sender reclaims everything that has not yet vested.
        let sender_refund = stream
            .total_amount
            .checked_sub(vested)
            .ok_or(Error::Overflow)?;

        if recipient_payout > 0 {
            #[allow(clippy::needless_borrows_for_generic_args)]
            token.transfer(&contract, &stream.recipient, &recipient_payout);
            stream.released_amount = vested;
        }

        if sender_refund > 0 {
            #[allow(clippy::needless_borrows_for_generic_args)]
            token.transfer(&contract, &stream.sender, &sender_refund);
        }

        stream.status = StreamStatus::Cancelled;
        stream.last_update = now;

        limits::decrement_sender_stream_count(&env, &stream.sender);
        storage::set_stream(&env, stream_id, &stream);

        events::cancelled(
            &env,
            stream_id,
            &stream.sender,
            sender_refund,
            recipient_payout,
            now,
        );

        Ok(stream)
    }

    /// Amends an active or paused stream to change its rate (via a new
    /// end-time) with overflow-safe, rate-aware validation.
    ///
    /// Only the stream sender may call this. The amendment moves the stream's
    /// `end_time`, which implicitly re-rates the remaining accrual. The
    /// following invariants are enforced so an amendment can never strand or
    /// claw back funds the recipient has already earned:
    ///
    /// 1. `new_rate_per_second` must be **positive** — a zero or negative rate
    ///    would never finish vesting the escrow.
    /// 2. `new_end_time` must be strictly **after `now`** and strictly after
    ///    `start_time`, so the resulting duration is non-zero.
    /// 3. The new schedule must still leave the **already-released amount**
    ///    within what will eventually vest (i.e. the recipient never ends up
    ///    "owing" funds). Because the full `total_amount` always vests by
    ///    `end_time`, this reduces to ensuring `total_amount >= released_amount`,
    ///    which is checked with overflow-safe arithmetic.
    /// 4. The implied rate is sanity-checked: streaming `total_amount` over the
    ///    new duration must not overflow `i128` (`total_amount * 1` headroom).
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Unauthorized`] if caller is not the stream sender.
    /// - [`Error::InvalidState`] if the stream is settled or cancelled.
    /// - [`Error::InvalidAmount`] if `new_rate_per_second <= 0`.
    /// - [`Error::InvalidTimeRange`] if `new_end_time <= now`,
    ///   `new_end_time <= start_time`, or the new duration computation overflows.
    /// - [`Error::Overflow`] if the re-rated accrual math would overflow `i128`.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `sender`.
    pub fn amend_stream(
        env: Env,
        stream_id: u64,
        new_rate_per_second: i128,
        new_end_time: u64,
    ) -> Result<Stream, Error> {
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status == StreamStatus::Settled || stream.status == StreamStatus::Cancelled {
            return Err(Error::InvalidState);
        }

        // (1) Rate-change validation: the new rate must be strictly positive.
        if new_rate_per_second <= 0 {
            return Err(Error::InvalidAmount);
        }

        let now = env.ledger().timestamp();

        // (2) The amended window must be in the future and non-degenerate.
        if new_end_time <= now || new_end_time <= stream.start_time {
            return Err(Error::InvalidTimeRange);
        }

        let new_duration = new_end_time
            .checked_sub(stream.start_time)
            .ok_or(Error::InvalidTimeRange)?;

        // (3) Already-released funds must remain within the eventual vest.
        if stream.released_amount > stream.total_amount {
            return Err(Error::Overflow);
        }

        // (4) Overflow-safe sanity check of the re-rated accrual. The vested
        //     formula is `total_amount * elapsed / new_duration`; the largest
        //     intermediate product uses `elapsed = new_duration`, so we verify
        //     `total_amount * new_duration` does not overflow `i128`.
        stream
            .total_amount
            .checked_mul(new_duration as i128)
            .ok_or(Error::Overflow)?;

        // Update stream parameters.
        stream.end_time = new_end_time;
        stream.duration = new_duration;
        stream.last_update = now;

        storage::set_stream(&env, stream_id, &stream);

        events::amended(
            &env,
            stream_id,
            &stream.sender,
            new_rate_per_second,
            new_end_time,
            now,
        );

        Ok(stream)
    }

    /// Read-only view returning unsettled accrual per (stream, recipient).
    ///
    /// # Parameters
    /// - `stream_id`: Numeric ID of the stream to query.
    /// - `recipient`: Recipient address to verify (optional).
    ///
    /// # Returns
    /// The unsettled accrual amount (vested minus released).
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    pub fn claim_drip(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        release::withdrawable(&stream, env.ledger().timestamp())
    }

    /// Upgrades the contract to a new WASM binary.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    /// - [`Error::NotFound`] if the contract has not been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        env.deployer()
            .update_current_contract_wasm(new_wasm_hash.clone());
        events::upgraded(&env, new_wasm_hash);
        Ok(())
    }

    // ──────────────────────────────────────────────────────────────────────
    // Read-only paginated enumeration views
    // ──────────────────────────────────────────────────────────────────────

    /// Returns a paginated list of all streams, ordered by ascending stream ID.
    ///
    /// This is a read-only view that never mutates state or requires auth.
    /// The global pause flag does not affect this call.
    ///
    /// # Parameters
    ///
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    ///   Pass `None` to start from the beginning (stream ID 1).
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams. If `next_cursor` is `Some(id)`,
    /// there are more streams; pass `id` as `start_after` to the next call.
    pub fn list_streams(env: Env, start_after: Option<u64>, limit: u64) -> views::StreamPage {
        views::list_streams(&env, start_after, limit)
    }

    /// Returns a paginated list of streams sent by a given address.
    ///
    /// This is a read-only view that never mutates state or requires auth.
    ///
    /// # Parameters
    ///
    /// - `sender` — Filter: only return streams where `stream.sender == sender`.
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams sent by `sender`.
    pub fn list_streams_by_sender(
        env: Env,
        sender: Address,
        start_after: Option<u64>,
        limit: u64,
    ) -> views::StreamPage {
        views::list_streams_by_sender(&env, &sender, start_after, limit)
    }

    /// Returns a paginated list of streams received by a given address.
    ///
    /// This is a read-only view that never mutates state or requires auth.
    ///
    /// # Parameters
    ///
    /// - `recipient` — Filter: only return streams where `stream.recipient == recipient`.
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams received by `recipient`.
    pub fn list_streams_by_recipient(
        env: Env,
        recipient: Address,
        start_after: Option<u64>,
        limit: u64,
    ) -> views::StreamPage {
        views::list_streams_by_recipient(&env, &recipient, start_after, limit)
    }

    /// Returns a paginated list of streams filtered by status.
    ///
    /// This is a read-only view that never mutates state or requires auth.
    ///
    /// # Parameters
    ///
    /// - `status` — Filter: only return streams where `stream.status == status`.
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams in the given status.
    pub fn list_streams_by_status(
        env: Env,
        status: StreamStatus,
        start_after: Option<u64>,
        limit: u64,
    ) -> views::StreamPage {
        views::list_streams_by_status(&env, status, start_after, limit)
    }

    /// Returns a paginated list of streams filtered by recipient and status.
    ///
    /// This is a read-only view commonly used by frontends to show a user's
    /// active/paused/settled streams.
    ///
    /// # Parameters
    ///
    /// - `recipient` — Filter: only return streams where `stream.recipient == recipient`.
    /// - `status` — Filter: only return streams where `stream.status == status`.
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams matching both filters.
    pub fn list_streams_recipient_status(
        env: Env,
        recipient: Address,
        status: StreamStatus,
        start_after: Option<u64>,
        limit: u64,
    ) -> views::StreamPage {
        views::list_streams_by_recipient_and_status(&env, &recipient, status, start_after, limit)
    }

    /// Returns a paginated list of streams filtered by sender and status.
    ///
    /// This is a read-only view that never mutates state or requires auth.
    ///
    /// # Parameters
    ///
    /// - `sender` — Filter: only return streams where `stream.sender == sender`.
    /// - `status` — Filter: only return streams where `stream.status == status`.
    /// - `start_after` — Exclusive cursor: return streams with `id > start_after`.
    /// - `limit` — Maximum number of streams to return. Capped at [`MAX_PAGE_SIZE`].
    ///
    /// # Returns
    ///
    /// A [`StreamPage`] with up to `limit` streams matching both filters.
    pub fn list_streams_sender_status(
        env: Env,
        sender: Address,
        status: StreamStatus,
        start_after: Option<u64>,
        limit: u64,
    ) -> views::StreamPage {
        views::list_streams_by_sender_and_status(&env, &sender, status, start_after, limit)
    }
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    storage::get_stream(env, stream_id).ok_or(Error::NotFound)
}

/// Verifies `caller` is the stored admin and requires their authorisation.
///
/// # Errors
/// - [`Error::NotFound`] if the contract has not been initialised.
/// - [`Error::Unauthorized`] if `caller` differs from the stored admin.
fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    let admin: Address = storage::get_admin(env).ok_or(Error::NotFound)?;

    if admin != *caller {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

/// Returns [`Error::ContractPaused`] when the global pause flag is `true`.
fn require_not_paused(env: &Env) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::ContractPaused);
    }

    Ok(())
}

/// Verifies the `recipient` has an established trustline for `token`.
///
/// We probe the recipient's balance through the SEP-41 token client. For a
/// Stellar Asset Contract wrapping a classic asset, the recipient must have a
/// trustline before they can hold a non-zero balance; the contract enforces a
/// non-negative balance here as a cheap, host-side liveness check that the
/// account can receive the asset. The native asset and well-formed SAC tokens
/// always return a (possibly zero) balance, so this never rejects a valid
/// recipient.
///
/// # Errors
/// - [`Error::RecipientTrustlineMissing`] if the recipient cannot hold the
///   token (balance query returns a negative value, which is impossible for a
///   trustlined account).
fn require_recipient_trustline(
    env: &Env,
    token: &Address,
    recipient: &Address,
) -> Result<(), Error> {
    let balance = token::Client::new(env, token).balance(recipient);
    if balance < 0 {
        return Err(Error::RecipientTrustlineMissing);
    }
    Ok(())
}

#[cfg(test)]
mod test;

#[cfg(test)]
mod prop_test;

/// Focused tests that close function-coverage gaps identified in the
/// GrantFox baseline (coverage-output.txt) and push the gate above 95 %.
/// See `src/coverage_test.rs` for the full test matrix.
#[cfg(test)]
mod coverage_test;

#[cfg(test)]
mod views_integration_test;

#[cfg(test)]
mod upgrade_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_upgrade() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        let new_wasm_hash = env.deployer().upload_contract_wasm(&[] as &[u8]);

        client.upgrade(&admin, &new_wasm_hash);
    }
}