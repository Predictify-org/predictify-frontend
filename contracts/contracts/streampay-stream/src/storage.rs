use soroban_sdk::{contracttype, Address, Env};

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
    pub pause_time: u64,
    pub total_paused_duration: u64,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Paused,
    StreamCount,
    Stream(u64),
    TokenAllowed(Address),
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
}

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn set_token_allowed(env: &Env, token: &Address, allowed: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::TokenAllowed(token.clone()), &allowed);
}

pub fn is_token_blocked(env: &Env, token: &Address) -> bool {
    match env
        .storage()
        .persistent()
        .get::<DataKey, bool>(&DataKey::TokenAllowed(token.clone()))
    {
        Some(allowed) => !allowed,
        None => false,
    }
}

pub fn next_stream_id(env: &Env) -> u64 {
    let storage = env.storage().instance();
    let id = storage.get(&DataKey::StreamCount).unwrap_or(1u64);
    storage.set(&DataKey::StreamCount, &(id + 1));
    id
}

pub fn set_stream(env: &Env, stream_id: u64, stream: &Stream) {
    env.storage()
        .persistent()
        .set(&DataKey::Stream(stream_id), stream);
}

pub fn get_stream(env: &Env, stream_id: u64) -> Option<Stream> {
    env.storage().persistent().get(&DataKey::Stream(stream_id))
}
