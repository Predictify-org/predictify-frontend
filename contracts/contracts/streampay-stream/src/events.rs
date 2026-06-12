//! # StreamPay contract events
//!
//! All events use a two-topic scheme for indexer filtering:
//!   topic[0] = symbol_short!("stream")   — identifies the StreamPay contract family
//!   topic[1] = symbol_short!("<event>")  — identifies the lifecycle transition
//!
//! ## Event schema (for Horizon indexers and the transactional outbox)
//!
//! | Event     | topic[1]    | Data tuple (in order)                                                                                    |
//! |-----------|-------------|----------------------------------------------------------------------------------------------------------|
//! | created   | "created"   | (stream_id: u64, sender: Address, recipient: Address, token: Address, total_amount: i128, timestamp: u64) |
//! | started   | "started"   | (stream_id: u64, start_time: u64, end_time: u64, timestamp: u64)                                         |
//! | withdrawn | "withdrawn" | (stream_id: u64, recipient: Address, amount: i128, timestamp: u64)                                       |
//! | settled   | "settled"   | (stream_id: u64, recipient: Address, total_amount: i128, timestamp: u64)                                 |
//! | paused    | "paused"    | (stream_id: u64, sender: Address, pause_time: u64, timestamp: u64)                                       |
//! | resumed   | "resumed"   | (stream_id: u64, sender: Address, end_time: u64, timestamp: u64)                                         |
//!
//! All events are emitted AFTER successful state mutation and any token transfer.
//! Failed calls (returning Err) emit no events.
//! `settled` is emitted in addition to `withdrawn` when a withdrawal fully drains the stream.

use soroban_sdk::{symbol_short, Address, Env};

/// Emits the `stream::created` event after `create_stream` has escrowed
/// `total_amount` from `sender`. Indexers observe this as the canonical
/// creation marker — the on-chain stream row already exists when this
/// event fires.
pub fn created(
    env: &Env,
    stream_id: u64,
    sender: &Address,
    recipient: &Address,
    token: &Address,
    total_amount: i128,
    timestamp: u64,
) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("created")),
        (
            stream_id,
            sender.clone(),
            recipient.clone(),
            token.clone(),
            total_amount,
            timestamp,
        ),
    );
}

/// Emits the `stream::started` event when a `Draft` stream transitions
/// to `Active`. Carries the freshly pinned `start_time` / `end_time`
/// so indexers can recompute schedules without re-reading storage.
pub fn started(env: &Env, stream_id: u64, start_time: u64, end_time: u64, timestamp: u64) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("started")),
        (stream_id, start_time, end_time, timestamp),
    );
}

/// Emits the `stream::withdrawn` event after a successful withdrawal.
/// The reported `amount` is the just-released delta, not the cumulative
/// `released_amount`. When the withdrawal drains the stream, a
/// `settled` event is published in addition.
pub fn withdrawn(env: &Env, stream_id: u64, recipient: &Address, amount: i128, timestamp: u64) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("withdrawn")),
        (stream_id, recipient.clone(), amount, timestamp),
    );
}

pub fn settled(
    env: &Env,
    stream_id: u64,
    recipient: &Address,
    total_amount: i128,
    timestamp: u64,
) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("settled")),
        (stream_id, recipient.clone(), total_amount, timestamp),
    );
}

pub fn paused(env: &Env, stream_id: u64, sender: &Address, pause_time: u64, timestamp: u64) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("paused")),
        (stream_id, sender.clone(), pause_time, timestamp),
    );
}

pub fn resumed(env: &Env, stream_id: u64, sender: &Address, end_time: u64, timestamp: u64) {
    env.events().publish(
        (symbol_short!("stream"), symbol_short!("resumed")),
        (stream_id, sender.clone(), end_time, timestamp),
    );
}
