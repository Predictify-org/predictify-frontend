#![no_std]

//! # StreamPay Stream Contract
//!
//! Defines the core `Stream` data model, `StreamStatus` enum, and `DataKey`
//! storage layout for the StreamPay payment-streaming contract on Stellar/Soroban.

mod storage;

use soroban_sdk::{contract, contractimpl, Address, Env};

pub use storage::{DataKey, Stream, StreamStatus};

#[contract]
pub struct StreamPayContract;

#[contractimpl]
impl StreamPayContract {
    /// Initialise the contract and record the admin address.
    ///
    /// # Panics
    /// Panics if the contract has already been initialised.
    pub fn initialize(env: Env, admin: Address) {
        if storage::has_admin(&env) {
            panic!("already initialised");
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_stream_count(&env, 0u64);
    }

    /// Return the current admin address.
    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    /// Return the total number of streams ever created (monotonic).
    pub fn stream_count(env: Env) -> u64 {
        storage::get_stream_count(&env)
    }

    /// Persist a `Stream` under the next available ID and return that ID.
    pub fn create_stream(env: Env, stream: Stream) -> u64 {
        stream.sender.require_auth();
        let id = storage::next_stream_id(&env);
        storage::set_stream(&env, id, &stream);
        id
    }

    /// Return the `Stream` for the given `id`, or `None` if it does not exist.
    pub fn get_stream(env: Env, id: u64) -> Option<Stream> {
        storage::get_stream(&env, id)
    }

    /// Overwrite an existing stream record. Only the stream's `sender` may update it.
    ///
    /// # Panics
    /// Panics if `id` does not correspond to a stored stream.
    pub fn update_stream(env: Env, id: u64, stream: Stream) {
        stream.sender.require_auth();
        if !storage::stream_exists(&env, id) {
            panic!("stream not found");
        }
        storage::set_stream(&env, id, &stream);
    }
}

mod test;
