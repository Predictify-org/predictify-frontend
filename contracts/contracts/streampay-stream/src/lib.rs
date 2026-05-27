#![no_std]

mod error;

use core::cmp::min;

pub use error::Error;
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contract]
pub struct Contract;

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
    /// Initializes contract administration for pause and token allow-listing.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::InvalidState);
        }

        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Paused, &false);
        Ok(())
    }

    /// Sets the emergency pause flag. Only the initialized admin may call this.
    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), Error> {
        require_admin(&env, &admin)?;
        env.storage().persistent().set(&DataKey::Paused, &paused);
        Ok(())
    }

    /// Allows or blocks a token for future stream creation.
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

    /// Creates a funded stream.
    ///
    /// The sender escrows the full `total_amount` at creation for both Draft
    /// and Active streams. Draft streams keep `start_time`/`end_time` at zero
    /// and accrue nothing until `start_stream` anchors them to the activation
    /// ledger timestamp.
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

    /// Activates a Draft stream.
    ///
    /// Only the stream sender may start it. Activation changes status to Active
    /// and sets `start_time`, `last_update`, and `end_time` from the activation
    /// ledger timestamp plus the configured duration.
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

    /// Returns a stored stream by id.
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, Error> {
        get_existing_stream(&env, stream_id)
    }

    /// Returns the amount accrued and available for withdrawal at this ledger.
    ///
    /// Draft streams always return zero because accrual starts only after
    /// `start_stream` anchors the activation time.
    pub fn withdrawable(env: Env, stream_id: u64) -> Result<i128, Error> {
        let stream = get_existing_stream(&env, stream_id)?;
        Ok(withdrawable_amount(&env, &stream))
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
    match env.storage().persistent().get(&DataKey::NextStreamId) {
        Some(id) => id,
        None => 1,
    }
}

fn get_existing_stream(env: &Env, stream_id: u64) -> Result<Stream, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Stream(stream_id))
        .ok_or(Error::NotFound)
}

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
    let paused = match env.storage().persistent().get(&DataKey::Paused) {
        Some(value) => value,
        None => false,
    };

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
