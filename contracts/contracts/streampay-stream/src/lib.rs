#![no_std]

mod error;
mod events;
mod release;
mod storage;

pub use error::Error;
use soroban_sdk::{contract, contractimpl, token, Address, Env};
pub use storage::{Stream, StreamStatus};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// One-time contract initialisation.
    ///
    /// Records `admin` as the privileged address for `set_paused` and
    /// `set_token_allowed`. Sets the global pause flag to `false`.
    ///
    /// # Errors
    /// - [`Error::InvalidState`] if the contract has already been initialised.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::has_admin(&env) {
            return Err(Error::InvalidState);
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
    /// - `Error::InvalidState` if the contract has already been
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
            return Err(Error::InvalidState);
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
        Ok(())
    }

    /// Allows or blocks a token for future stream creation.
    ///
    /// Tokens are allowed by default (no entry in storage). Setting
    /// `allowed = false` blocks the token; `allowed = true` re-enables it.
    /// Existing streams using a subsequently blocked token are unaffected.
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
        Ok(())
    }

    /// Creates a funded stream and escrows `total_amount` from `sender`.
    ///
    /// **Token transfer**: `total_amount` is transferred from `sender` to the
    /// contract address immediately, regardless of `draft`.
    ///
    /// If `draft = false` the stream is `Active` immediately with
    /// `start_time = now` and `end_time = now + duration`.
    /// If `draft = true` the stream is `Draft`; `start_time`, `end_time`, and
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
    /// - [`Error::InvalidState`] if `sender == recipient`.
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

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if sender == recipient {
            return Err(Error::InvalidState);
        }

        if storage::is_token_blocked(&env, &token) {
            return Err(Error::TokenNotAllowed);
        }

        if end_time <= start_time {
            return Err(Error::InvalidTimeRange);
        }

        let now = env.ledger().timestamp();
        if start_time < now {
            return Err(Error::InvalidTimeRange);
        }

        let duration = end_time - start_time;
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
        events::created(&env, id, &stream.sender, &stream.recipient, &stream.token, stream.total_amount, now);

        Ok(id)
    }

    /// Activates a `Draft` stream, anchoring its time bounds to the current
    /// ledger timestamp.
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
        events::started(&env, stream_id, stream.start_time, stream.end_time, stream.start_time);

        Ok(stream)
    }

    /// Returns the stored stream record for `stream_id`.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        get_existing_stream(&env, stream_id)
    }

    /// Returns the token amount currently accrued and available for withdrawal.
    ///
    /// Delegates to [`withdrawable_amount`]. Returns `0` for `Draft` streams.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    pub fn withdrawable(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        Ok(withdrawable_amount(env.ledger().timestamp(), &stream))
    }

    /// Returns the stream balance (vested amount) at a given ledger timestamp.
    ///
    /// This is a view function that computes how much of the stream has vested
    /// based on linear accrual from start_time to end_time. It uses overflow-safe
    /// checked arithmetic to ensure correctness even with large amounts.
    ///
    /// # Arguments
    ///
    /// * `stream_id` - The ID of the stream to query
    ///
    /// # Returns
    ///
    /// The vested amount as an i128, always in the range `[0, total_amount]`.
    pub fn stream_balance(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        Ok(stream_balance_amount(&env, &stream))
    }

    /// Withdraws accrued escrow to the recipient.
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
        let available = withdrawable_amount(now, &stream);
        if amount > available {
            return Err(Error::OverWithdraw);
        }

        stream.released_amount += amount;
        stream.last_update = now;

        if stream.released_amount == stream.total_amount {
            stream.status = StreamStatus::Settled;
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

    /// Pauses an active stream, freezing accrual while preserving vested funds.
    ///
    /// Only the stream sender may call this. On pause, status is set to Paused
    /// and pause_time is recorded. Vested amount remains withdrawable but does
    /// not increase while paused.
    pub fn pause(env: Env, stream_id: u64) -> Result<Stream, Error> {
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();

        if stream.status != StreamStatus::Active {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        
        stream.last_update = now;
        stream.status = StreamStatus::Paused;
        stream.pause_time = now;

        storage::set_stream(&env, stream_id, &stream);

        Ok(stream)
    }

    /// Resumes a paused stream, extending end_time to preserve unstreamed time.
    ///
    /// Only the stream sender may call this. On resume, the end_time is extended
    /// by the paused duration so the remaining streamable amount is preserved.
    /// Status is set back to Active.
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

        let payout_amount = stream.total_amount - stream.released_amount;
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

        storage::set_stream(&env, stream_id, &stream);

        Ok(())
    }
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    storage::get_stream(env, stream_id).ok_or(Error::NotFound)
}

fn withdrawable_amount(now: u64, stream: &Stream) -> i128 {
    release::withdrawable(stream, now)
}

fn stream_balance_amount(env: &Env, stream: &Stream) -> i128 {
    release::vested_amount(stream, env.ledger().timestamp())
}

fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    let admin: Address = storage::get_admin(env).ok_or(Error::NotFound)?;

    if admin != *caller {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::ContractPaused);
    }

    Ok(())
}

#[cfg(test)]
mod test;

#[cfg(test)]
mod prop_test;
