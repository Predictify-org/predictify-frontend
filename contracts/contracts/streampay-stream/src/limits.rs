use soroban_sdk::{contracttype, Address, Env};

use crate::Error;

const DEFAULT_MAX_STREAMS_PER_SENDER: u64 = 10;

const SENDER_COUNT_TTL_MIN_REMAINING: u32 = 120_960;
const SENDER_COUNT_TTL_EXTEND_TO: u32 = 483_840;

const INSTANCE_TTL_MIN_REMAINING: u32 = 43_200;
const INSTANCE_TTL_EXTEND_TO: u32 = 120_960;

#[derive(Clone)]
#[contracttype]
enum LimitDataKey {
    MaxStreamsPerSender,
    SenderStreamCount(Address),
}

fn ttl_target(env: &Env, extra: u32) -> u32 {
    env.ledger().sequence().saturating_add(extra)
}

fn extend_instance_ttl(env: &Env) {
    let threshold = env
        .ledger()
        .sequence()
        .saturating_add(INSTANCE_TTL_MIN_REMAINING);
    let target = ttl_target(env, INSTANCE_TTL_EXTEND_TO);
    env.storage().instance().extend_ttl(threshold, target);
}

fn extend_sender_count_ttl(env: &Env, sender: &Address) {
    let threshold = env
        .ledger()
        .sequence()
        .saturating_add(SENDER_COUNT_TTL_MIN_REMAINING);
    let target = ttl_target(env, SENDER_COUNT_TTL_EXTEND_TO);
    env.storage().persistent().extend_ttl(
        &LimitDataKey::SenderStreamCount(sender.clone()),
        threshold,
        target,
    );
}

pub fn get_max_streams_per_sender(env: &Env) -> u64 {
    let stored: Option<u64> = env
        .storage()
        .instance()
        .get(&LimitDataKey::MaxStreamsPerSender);
    if stored.is_some() {
        extend_instance_ttl(env);
    }
    stored.unwrap_or(DEFAULT_MAX_STREAMS_PER_SENDER)
}

pub fn set_max_streams_per_sender(env: &Env, limit: u64) {
    env.storage()
        .instance()
        .set(&LimitDataKey::MaxStreamsPerSender, &limit);
    extend_instance_ttl(env);
}

pub fn get_sender_stream_count(env: &Env, sender: &Address) -> u64 {
    let count: u64 = env
        .storage()
        .persistent()
        .get(&LimitDataKey::SenderStreamCount(sender.clone()))
        .unwrap_or(0);
    if count > 0 {
        extend_sender_count_ttl(env, sender);
    }
    count
}

pub fn increment_sender_stream_count(env: &Env, sender: &Address) {
    let count = get_sender_stream_count(env, sender).saturating_add(1);
    env.storage()
        .persistent()
        .set(&LimitDataKey::SenderStreamCount(sender.clone()), &count);
    extend_sender_count_ttl(env, sender);
}

pub fn decrement_sender_stream_count(env: &Env, sender: &Address) {
    let count = get_sender_stream_count(env, sender);
    if count > 0 {
        let new_count = count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&LimitDataKey::SenderStreamCount(sender.clone()), &new_count);
        if new_count > 0 {
            extend_sender_count_ttl(env, sender);
        }
    }
}

pub fn check_sender_limit(env: &Env, sender: &Address) -> Result<(), Error> {
    let limit = get_max_streams_per_sender(env);
    let current = get_sender_stream_count(env, sender);
    if current >= limit {
        return Err(Error::StreamLimitExceeded);
    }
    Ok(())
}

/// Returns how many additional streams `sender` may still create before
/// hitting the configured per-sender limit.
///
/// Returns `0` once the sender is at or above the limit, so callers can
/// surface remaining capacity in a UI without performing their own
/// overflow-safe subtraction.
pub fn remaining_sender_capacity(env: &Env, sender: &Address) -> u64 {
    let limit = get_max_streams_per_sender(env);
    let current = get_sender_stream_count(env, sender);
    limit.saturating_sub(current)
}
