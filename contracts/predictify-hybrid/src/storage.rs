use soroban_sdk::{Env, IntoVal, TryFromVal, Val};
use crate::DataKey;

pub const MIN_TTL: u32 = 17_280;
pub const MAX_TTL: u32 = 34_560;
pub const PERSISTENT_MIN_TTL: u32 = 518_400;
pub const PERSISTENT_MAX_TTL: u32 = 2_073_600;

pub fn extend_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(MIN_TTL, MAX_TTL);
}

pub fn instance_get<T>(env: &Env, key: &DataKey) -> Option<T>
where
    T: TryFromVal<Env, Val> + Clone,
{
    env.storage().instance().get(key)
}

pub fn instance_set<T>(env: &Env, key: &DataKey, value: &T)
where
    T: IntoVal<Env, Val> + Clone,
{
    env.storage().instance().set(key, value);
}

pub fn persistent_get<T>(env: &Env, key: &DataKey) -> Option<T>
where
    T: TryFromVal<Env, Val> + Clone,
{
    let val: Option<T> = env.storage().persistent().get(key);
    if val.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(key, PERSISTENT_MIN_TTL, PERSISTENT_MAX_TTL);
    }
    val
}

pub fn persistent_set<T>(env: &Env, key: &DataKey, value: &T)
where
    T: IntoVal<Env, Val> + Clone,
{
    env.storage().persistent().set(key, value);
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_MIN_TTL, PERSISTENT_MAX_TTL);
}
