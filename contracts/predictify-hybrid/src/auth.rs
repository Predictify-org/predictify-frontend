use soroban_sdk::{panic_with_error, symbol_short, Address, Env, String};
use crate::{storage, ContractError, DataKey};

pub fn require_admin(env: &Env) {
    let admin: Address = storage::instance_get(env, &DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, ContractError::NotInitialized));
    let context = String::from_str(env, "admin authorization required for recovery");
    env.events()
        .publish((symbol_short!("auth_req"),), context);
    admin.require_auth();
}
