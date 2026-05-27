#![no_std]

mod error;

use core::cmp::min;

pub use error::Error;
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contract]
pub struct Contract;

/// Lifecycle state of a payment stream.
///
/// Transitions allowed by the current public API:
/// ```text
/// Draft ──start_stream──► Active ──withdraw (full)──► Settled
/// ```
/// `Paused`, `Ended`, and `Cancelled` are reserved for future entry points.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum StreamStatus {
    /// Created and funded but not yet activated; accrual has not started.
    Draft,
    /// Tokens are flowing linearly to the recipient.
    Active,
    /// Reserved — stream-level pause not yet implemented.
    Paused,
    /// All `total_amount` tokens have been released to the recipient.
    Settled,
    /// Reserved — natural expiry entry point not yet implemented.
    Ended,
    /// Reserved — sender-initiated cancellation not yet implemented.
    Cancelled,
}

/// On-chain record for a single payment stream.
///
/// All token amounts are in the token's base unit (stroops for XLM-based
/// assets). All timestamps are Unix seconds as reported by the ledger.
#[derive(Clone, Debug)]
#[contracttype]
pub struct Stream {
    /// Unique monotonic identifier assigned at creation. Starts at 1.
    pub id: u64,
    /// Address that created the stream and escrowed `total_amount`.
    pub sender: Address,
    /// Address that receives streamed tokens via `withdraw`.
    pub recipient: Address,
    /// Stellar asset contract address being streamed.
    pub token: Address,
    /// Total tokens (base units) locked in escrow at creation. Always > 0.
    pub total_amount: i128,
    /// Tokens already transferred to `recipient`. Monotonically non-decreasing.
    /// Invariant: `released_amount <= total_amount`.
    pub released_amount: i128,
    /// Ledger timestamp when accrual begins. Zero for `Draft` streams.
    pub start_time: u64,
    /// Ledger timestamp when accrual ends (`start_time + duration`).
    /// Zero for `Draft` streams.
    pub end_time: u64,
    /// Stream length in seconds. Set at creation; never changes.
    pub duration: u64,
    /// Ledger timestamp of the last state-mutating operation on this stream.
    pub last_update: u64,
    /// Current lifecycle status.
    pub status: StreamStatus,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Paused,
    NextStreamId,
    Stream(u64),
    TokenAllowed(Address),
}

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
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::InvalidState);
        }

        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Paused, &false);
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
        env.storage().persistent().set(&DataKey::Paused, &paused);
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
        env.storage()
            .persistent()
            .set(&DataKey::TokenAllowed(token), &allowed);
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

        if is_token_blocked(&env, &token) {
            return Err(Error::TokenNotAllowed);
        }

        if duration == 0 {
            return Err(Error::InvalidTimeRange);
        }

        let id = next_stream_id(&env);
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

        #[allow(clippy::needless_borrows_for_generic_args)]
        token::Client::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &total_amount,
        );

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
        };

        env.storage()
            .persistent()
            .set(&DataKey::Stream(id), &stream);
        env.storage()
            .persistent()
            .set(&DataKey::NextStreamId, &(id + 1));

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

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);

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
        Ok(withdrawable_amount(&env, &stream))
    }

    /// Withdraws `amount` of accrued tokens to the stream's `recipient`.
    ///
    /// **Token transfer**: `amount` is transferred from the contract address to
    /// `recipient`. If this brings `released_amount` to `total_amount` the
    /// stream transitions to `Settled`.
    ///
    /// # Errors
    /// - [`Error::ContractPaused`] if the global pause flag is set.
    /// - [`Error::InvalidAmount`] if `amount <= 0`.
    /// - [`Error::NotFound`] if `stream_id` does not exist.
    /// - [`Error::AlreadySettled`] if the stream is already `Settled`.
    /// - [`Error::InvalidState`] if the stream is not `Active`.
    /// - [`Error::OverWithdraw`] if `amount` exceeds the currently accrued
    ///   withdrawable balance.
    ///
    /// Returns `amount` on success.
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

        if stream.status != StreamStatus::Active {
            return Err(Error::InvalidState);
        }

        let available = withdrawable_amount(&env, &stream);
        if amount > available {
            return Err(Error::OverWithdraw);
        }

        stream.released_amount += amount;
        stream.last_update = env.ledger().timestamp();

        if stream.released_amount == stream.total_amount {
            stream.status = StreamStatus::Settled;
        }

        #[allow(clippy::needless_borrows_for_generic_args)]
        token::Client::new(&env, &stream.token).transfer(
            &env.current_contract_address(),
            &stream.recipient,
            &amount,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Stream(stream_id), &stream);

        Ok(amount)
    }
}

fn next_stream_id(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::NextStreamId)
        .unwrap_or(1)
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Stream(stream_id))
        .ok_or(Error::NotFound)
}

/// Computes the token amount accrued and not yet withdrawn for `stream`.
///
/// Formula (integer arithmetic, truncates toward zero — always floors):
/// ```text
/// elapsed = min(now, end_time) − start_time
/// accrued = (total_amount × elapsed) / duration
/// result  = accrued − released_amount
/// ```
///
/// The `min` cap ensures accrual never exceeds `total_amount` after
/// `end_time`. Because integer division truncates, dust (the remainder of
/// `total_amount % duration`) is withheld until `elapsed == duration`, at
/// which point `accrued == total_amount` exactly — no tokens are permanently
/// lost. Rounding always favours the sender (recipient receives slightly less
/// mid-stream, never more).
///
/// Returns `0` for any non-`Active` stream or when `start_time == 0`.
fn withdrawable_amount(env: &Env, stream: &Stream) -> i128 {
    if stream.status != StreamStatus::Active || stream.start_time == 0 {
        return 0;
    }

    let now = env.ledger().timestamp();
    let elapsed = min(now, stream.end_time) - stream.start_time;
    let accrued = (stream.total_amount * elapsed as i128) / stream.duration as i128;

    accrued - stream.released_amount
}

fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    let admin: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .ok_or(Error::NotFound)?;

    if admin != *caller {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    let paused = env
        .storage()
        .persistent()
        .get(&DataKey::Paused)
        .unwrap_or_default();

    if paused {
        return Err(Error::ContractPaused);
    }

    Ok(())
}

fn is_token_blocked(env: &Env, token: &Address) -> bool {
    match env
        .storage()
        .persistent()
        .get::<DataKey, bool>(&DataKey::TokenAllowed(token.clone()))
    {
        Some(allowed) => !allowed,
        None => false,
    }
}

#[cfg(test)]
mod test;
