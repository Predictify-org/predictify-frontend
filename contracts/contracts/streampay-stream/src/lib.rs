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
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        total_amount: i128,
        duration: u64,
        draft: bool,
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

        if duration == 0 {
            return Err(Error::InvalidTimeRange);
        }

        let id = storage::next_stream_id(&env);
        let now = env.ledger().timestamp();
        let (start_time, end_time, last_update, status) = if draft {
            (0, 0, 0, StreamStatus::Draft)
        } else {
            (
                now,
                now.checked_add(duration).ok_or(Error::InvalidTimeRange)?,
                now,
                StreamStatus::Active,
            )
        };
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
            last_update,
            status,
            pause_time: 0,
            total_paused_duration: 0,
        };

        storage::set_stream(&env, id, &stream);
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
    /// Delegates to [`release::withdrawable`]. Returns `0` for `Draft` streams.
    ///
    /// # Errors
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    pub fn withdrawable(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        Ok(release::withdrawable(&stream, env.ledger().timestamp()))
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
        Ok(release::vested_amount(&stream, env.ledger().timestamp()))
    }

    /// Withdraws accrued escrow to the recipient.
    ///
    /// Follows checks-effects-interactions: stream accounting is persisted before
    /// the SEP-41 transfer, then a post-transfer storage re-read asserts invariants
    /// to surface unexpected token-side behaviour at the external-call boundary.
    pub fn withdraw(env: Env, stream_id: u64, amount: i128) -> Result<i128, Error> {
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let stream = get_existing_stream(&env, stream_id)?;
        stream.recipient.require_auth();

        if stream.status == StreamStatus::Settled {
            return Err(Error::AlreadySettled);
        }

        // Allow withdrawals from Active or Paused streams.
        if stream.status != StreamStatus::Active && stream.status != StreamStatus::Paused {
            return Err(Error::InvalidState);
        }

        let now = env.ledger().timestamp();
        let available = release::withdrawable(&stream, now);
        if amount > available {
            return Err(Error::OverWithdraw);
        }

        let expected_released = stream.released_amount + amount;
        let expected_last_update = now;
        let expected_status = if expected_released == stream.total_amount {
            StreamStatus::Settled
        } else {
            stream.status
        };

        let mut updated = stream;
        updated.released_amount = expected_released;
        updated.last_update = expected_last_update;
        updated.status = expected_status;

        // Effects before interactions: persist accounting before the token call.
        storage::set_stream(&env, stream_id, &updated);

        // Interactions: SEP-41 token transfer.
        #[allow(clippy::needless_borrows_for_generic_args)]
        token::Client::new(&env, &updated.token).transfer(
            &env.current_contract_address(),
            &updated.recipient,
            &amount,
        );

        // Post-transfer reentrancy-equivalent guard.
        assert_post_withdraw_transfer_invariants(
            &env,
            stream_id,
            &updated,
            expected_released,
            expected_last_update,
            expected_status,
        )?;

        events::withdrawn(&env, stream_id, &updated.recipient, amount, expected_last_update);
        if expected_status == StreamStatus::Settled {
            events::settled(
                &env,
                stream_id,
                &updated.recipient,
                updated.total_amount,
                expected_last_update,
            );
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
        events::paused(&env, stream_id, &stream.sender, stream.pause_time, stream.pause_time);

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

        stream.total_paused_duration = stream
            .total_paused_duration
            .checked_add(paused_duration)
            .ok_or(Error::InvalidTimeRange)?;

        stream.end_time = stream
            .end_time
            .checked_add(paused_duration)
            .ok_or(Error::InvalidTimeRange)?;

        stream.last_update = now;
        stream.status = StreamStatus::Active;
        stream.pause_time = 0;

        storage::set_stream(&env, stream_id, &stream);
        events::resumed(&env, stream_id, &stream.sender, stream.end_time, stream.last_update);

        Ok(stream)
    }

    /// Cancels an active stream early. Reserved for lifecycle expansion; requires
    /// sender authorisation before any state transition is applied.
    pub fn cancel_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        stream.sender.require_auth();
        Err(Error::InvalidState)
    }

    /// Finalizes a stream whose time window has fully elapsed, paying out
    /// any remaining vested funds to the recipient and transitioning it to a
    /// terminal `Settled` state.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the contract is paused.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::InvalidState`] if the stream is in `Draft` or cancelled state,
    ///   or if the current ledger timestamp has not yet reached `end_time`.
    ///
    /// # Auth
    /// Requires authorisation from the stream's `recipient`.
    pub fn settle(env: Env, stream_id: u64) -> Result<(), Error> {
        require_not_paused(&env)?;
        let mut stream = get_existing_stream(&env, stream_id)?;
        stream.recipient.require_auth();

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
            stream.released_amount = stream.total_amount;
            stream.last_update = now;
            stream.status = StreamStatus::Settled;
            storage::set_stream(&env, stream_id, &stream);

            #[allow(clippy::needless_borrows_for_generic_args)]
            token::Client::new(&env, &stream.token).transfer(
                &env.current_contract_address(),
                &stream.recipient,
                &payout_amount,
            );
        } else {
            stream.status = StreamStatus::Settled;
            stream.last_update = now;
            storage::set_stream(&env, stream_id, &stream);
        }

        Ok(())
    }
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    storage::get_stream(env, stream_id).ok_or(Error::NotFound)
}

/// Re-reads persisted stream state after a withdraw token transfer and asserts
/// accounting invariants. Surfaces SEP-41 token misbehaviour or unexpected
/// storage mutation at the external-call boundary.
fn assert_post_withdraw_transfer_invariants(
    env: &Env,
    stream_id: u64,
    expected: &Stream,
    expected_released: i128,
    expected_last_update: u64,
    expected_status: StreamStatus,
) -> Result<(), Error> {
    let stored = get_existing_stream(env, stream_id)?;

    if stored.released_amount != expected_released
        || stored.last_update != expected_last_update
        || stored.status != expected_status
    {
        return Err(Error::InvalidState);
    }

    if stored.released_amount < 0 || stored.released_amount > stored.total_amount {
        return Err(Error::InvalidState);
    }

    if stored.id != expected.id
        || stored.sender != expected.sender
        || stored.recipient != expected.recipient
        || stored.token != expected.token
        || stored.total_amount != expected.total_amount
    {
        return Err(Error::InvalidState);
    }

    Ok(())
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
mod malicious_token;

#[cfg(test)]
mod test;

#[cfg(test)]
mod prop_test;

#[cfg(test)]
mod withdraw_guard_tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::StellarAssetClient,
        Address, Env,
    };

    #[test]
    fn post_transfer_guard_rejects_storage_drift() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);

        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        StellarAssetClient::new(&env, &token).mint(&sender, &i128::MAX);

        client.initialize(&admin);
        let stream_id = client.create_stream(&sender, &recipient, &token, &1_000, &100, &false);
        env.ledger().set_timestamp(1_050);
        client.withdraw(&stream_id, &200);

        let expected = client.get_stream(&stream_id);
        let mut tampered = expected.clone();
        tampered.released_amount = 0;
        env.as_contract(&contract_id, || {
            storage::set_stream(&env, stream_id, &tampered);
        });

        let err = env.as_contract(&contract_id, || {
            assert_post_withdraw_transfer_invariants(
                &env,
                stream_id,
                &expected,
                expected.released_amount,
                expected.last_update,
                expected.status,
            )
        });
        assert_eq!(err, Err(Error::InvalidState));
    }
}
