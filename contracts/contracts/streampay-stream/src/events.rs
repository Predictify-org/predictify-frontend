//! # StreamPay contract events
//!
//! All events use a two-topic scheme: `("stream", "<event>")`.
//!
//! All events are emitted AFTER successful state mutation and any token transfer.
//! Failed calls (returning Err) emit no events.
//! `settled` is emitted in addition to `withdrawn` when a withdrawal fully drains the stream.

use soroban_sdk::{contractevent, Address, BytesN, Env, Symbol};

#[contractevent(topics = ["stream", "created"], data_format = "vec")]
pub struct StreamCreated {
    pub stream_id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub token: Address,
    pub total_amount: i128,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "started"], data_format = "vec")]
pub struct StreamStarted {
    pub stream_id: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "withdrawn"], data_format = "vec")]
pub struct StreamWithdrawn {
    pub stream_id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "settled"], data_format = "vec")]
pub struct StreamSettled {
    pub stream_id: u64,
    pub recipient: Address,
    pub total_amount: i128,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "paused"], data_format = "vec")]
pub struct StreamPaused {
    pub stream_id: u64,
    pub sender: Address,
    pub pause_time: u64,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "resumed"], data_format = "vec")]
pub struct StreamResumed {
    pub stream_id: u64,
    pub sender: Address,
    pub end_time: u64,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "cancelled"], data_format = "vec")]
pub struct StreamCancelled {
    pub stream_id: u64,
    pub cancelled_by: Address,
    pub returned_amount: i128,
    pub released_amount: i128,
    pub timestamp: u64,
}

#[contractevent(topics = ["stream", "amended"], data_format = "vec")]
pub struct StreamAmended {
    pub stream_id: u64,
    pub amended_by: Address,
    pub new_rate_per_second: i128,
    pub new_end_time: u64,
    pub timestamp: u64,
}

#[contractevent(topics = ["StreamPay", "upgraded"], data_format = "single-value")]
pub struct ContractUpgraded {
    pub new_wasm_hash: BytesN<32>,
}

#[contractevent(topics = ["stream", "adminact"], data_format = "vec")]
pub struct AdminAction {
    pub stream_id: u64,
    pub admin: Address,
    pub action: Symbol,
    pub timestamp: u64,
}

pub fn created(
    env: &Env,
    stream_id: u64,
    sender: &Address,
    recipient: &Address,
    token: &Address,
    total_amount: i128,
    timestamp: u64,
) {
    StreamCreated {
        stream_id,
        sender: sender.clone(),
        recipient: recipient.clone(),
        token: token.clone(),
        total_amount,
        timestamp,
    }
    .publish(env);
}

pub fn started(env: &Env, stream_id: u64, start_time: u64, end_time: u64, timestamp: u64) {
    StreamStarted {
        stream_id,
        start_time,
        end_time,
        timestamp,
    }
    .publish(env);
}

pub fn withdrawn(env: &Env, stream_id: u64, recipient: &Address, amount: i128, timestamp: u64) {
    StreamWithdrawn {
        stream_id,
        recipient: recipient.clone(),
        amount,
        timestamp,
    }
    .publish(env);
}

pub fn settled(env: &Env, stream_id: u64, recipient: &Address, total_amount: i128, timestamp: u64) {
    StreamSettled {
        stream_id,
        recipient: recipient.clone(),
        total_amount,
        timestamp,
    }
    .publish(env);
}

pub fn paused(env: &Env, stream_id: u64, sender: &Address, pause_time: u64, timestamp: u64) {
    StreamPaused {
        stream_id,
        sender: sender.clone(),
        pause_time,
        timestamp,
    }
    .publish(env);
}

#[allow(dead_code)]
pub fn resumed(env: &Env, stream_id: u64, sender: &Address, end_time: u64, timestamp: u64) {
    StreamResumed {
        stream_id,
        sender: sender.clone(),
        end_time,
        timestamp,
    }
    .publish(env);
}

pub fn upgraded(env: &Env, new_wasm_hash: BytesN<32>) {
    ContractUpgraded { new_wasm_hash }.publish(env);
}

pub fn cancelled(
    env: &Env,
    stream_id: u64,
    cancelled_by: &Address,
    returned_amount: i128,
    released_amount: i128,
    timestamp: u64,
) {
    StreamCancelled {
        stream_id,
        cancelled_by: cancelled_by.clone(),
        returned_amount,
        released_amount,
        timestamp,
    }
    .publish(env);
}

pub fn amended(
    env: &Env,
    stream_id: u64,
    amended_by: &Address,
    new_rate_per_second: i128,
    new_end_time: u64,
    timestamp: u64,
) {
    StreamAmended {
        stream_id,
        amended_by: amended_by.clone(),
        new_rate_per_second,
        new_end_time,
        timestamp,
    }
    .publish(env);
}

pub fn admin_action(env: &Env, stream_id: u64, admin: &Address, action: Symbol, timestamp: u64) {
    AdminAction {
        stream_id,
        admin: admin.clone(),
        action,
        timestamp,
    }
    .publish(env);
}
