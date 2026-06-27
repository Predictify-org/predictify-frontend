#![no_std]

mod error;
mod events;
mod limits;
mod release;
mod storage;

pub use error::Error;
use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env};
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

    /// Sets the maximum number of active streams a single sender may have.
    ///
    /// When a sender reaches this limit, `create_stream` returns
    /// [`Error::StreamLimitExceeded`. The default is 10.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if `admin` is not the initialised admin.
    ///
    /// # Auth
    /// Requires authorisation from `admin`.
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
        limits::check_sender_limit(&env, &sender)?;

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
    /// - [`Error::Overflow`] if the vested-amount computation overflows.
    pub fn withdrawable(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        release::withdrawable(&stream, env.ledger().timestamp())
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
    /// Returns `Err(Error::Overflow)` if arithmetic overflows on extreme inputs.
    pub fn stream_balance(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        release::vested_amount(&stream, env.ledger().timestamp())
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
        let available = release::withdrawable(&stream, now)?;
        if amount > available {
            return Err(Error::OverWithdraw);
        }

        stream.released_amount += amount;
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
        
        // Emit admin_action event for pause
        events::admin_action(
            &env,
            stream_id,
            &stream.sender,
            soroban_sdk::symbol_short!("pause"),
            now,
        );

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

        limits::decrement_sender_stream_count(&env, &stream.sender);
        storage::set_stream(&env, stream_id, &stream);
        
        // Emit admin_action event for settle
        events::admin_action(
            &env,
            stream_id,
            &stream.recipient,
            soroban_sdk::symbol_short!("settle"),
            now,
        );

        Ok(())
    }

    /// Cancels an active or paused stream, returning unstreamed funds to the sender.
    ///
    /// Only the stream sender may call this. On cancellation, the stream status is set to
    /// `Cancelled`, and the unstreamed portion of `total_amount - released_amount` is
    /// transferred back to the sender. Any amount already released to the recipient is kept.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Unauthorized`] if caller is not the stream sender.
    /// - [`Error::InvalidState`] if the stream is already settled or cancelled.
    /// - [`Error::Overflow`] if amount calculation overflows.
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

        // Calculate returned amount: unstreamed portion
        let returned_amount = stream
            .total_amount
            .checked_sub(stream.released_amount)
            .ok_or(Error::Overflow)?;

        // Transfer unstreamed funds back to sender
        if returned_amount > 0 {
            #[allow(clippy::needless_borrows_for_generic_args)]
            token::Client::new(&env, &stream.token).transfer(
                &env.current_contract_address(),
                &stream.sender,
                &returned_amount,
            );
        }

        // Update stream state
        stream.status = StreamStatus::Cancelled;
        stream.last_update = now;

        limits::decrement_sender_stream_count(&env, &stream.sender);
        storage::set_stream(&env, stream_id, &stream);

        // Emit cancellation event
        events::cancelled(
            &env,
            stream_id,
            &stream.sender,
            returned_amount,
            stream.released_amount,
            now,
        );

        Ok(stream)
    }

    /// Amends an active or paused stream to change its rate or end time.
    ///
    /// Only the stream sender may call this. The new `end_time` must be greater than
    /// the current timestamp. The new rate and end_time replace the existing values.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::Unauthorized`] if caller is not the stream sender.
    /// - [`Error::InvalidState`] if the stream is settled or cancelled.
    /// - [`Error::InvalidTimeRange`] if `new_end_time <= now`.
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

        let now = env.ledger().timestamp();

        if new_end_time <= now {
            return Err(Error::InvalidTimeRange);
        }

        // Store old values for event (0 means unchanged)
        let old_end_time = stream.end_time;
        let old_rate = if stream.duration > 0 {
            stream
                .total_amount
                .checked_div(stream.duration as i128)
                .unwrap_or(0)
        } else {
            0
        };

        // Update stream parameters
        stream.end_time = new_end_time;
        stream.last_update = now;

        // Recalculate duration if needed
        let new_duration = new_end_time
            .checked_sub(stream.start_time)
            .ok_or(Error::InvalidTimeRange)?;
        stream.duration = new_duration;

        storage::set_stream(&env, stream_id, &stream);

        // Emit amendment event
        // Report the new rate and new end_time; 0 means no change for backward compat
        let reported_rate = if new_rate_per_second != old_rate {
            new_rate_per_second
        } else {
            0
        };
        let reported_end_time = if new_end_time != old_end_time {
            new_end_time
        } else {
            0
        };

        events::amended(
            &env,
            stream_id,
            &stream.sender,
            reported_rate,
            reported_end_time,
            now,
        );

        Ok(stream)
    }

    /// Upgrades the contract to a new WASM binary.
    ///
    /// This function is admin-only and allows for updating the contract's
    /// code while preserving its state. It emits an `upgraded` event upon
    /// successful execution.
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
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    storage::get_stream(env, stream_id).ok_or(Error::NotFound)
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

#[cfg(test)]
mod upgrade_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_upgrade() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, Contract);
        let client = ContractClient::new(&env, &contract_id);

        client.initialize(&admin);

        let new_wasm_hash = env.deployer().upload_contract_wasm(&[] as &[u8]);

        client.upgrade(&admin, &new_wasm_hash);
    }
}
