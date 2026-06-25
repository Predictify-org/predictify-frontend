#![cfg(test)]

use crate::ContractClient;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    StreamContract,
    StreamId,
    Balance(Address),
}

/// Mock SEP-41 token that attempts a nested `withdraw` during `transfer`.
#[contract]
pub struct MaliciousToken;

#[contractimpl]
impl MaliciousToken {
    pub fn configure(env: Env, stream: Address, stream_id: u64) {
        env.storage().instance().set(&DataKey::StreamContract, &stream);
        env.storage().instance().set(&DataKey::StreamId, &stream_id);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let key = DataKey::Balance(to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(bal + amount));
    }

    pub fn balance(env: Env, who: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(who))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if let (Some(stream), Some(stream_id)) = (
            env.storage().instance().get(&DataKey::StreamContract),
            env.storage().instance().get(&DataKey::StreamId),
        ) {
            let client = ContractClient::new(&env, &stream);
            let _ = client.try_withdraw(&stream_id, &amount);
        }

        let from_key = DataKey::Balance(from.clone());
        let to_key = DataKey::Balance(to.clone());
        let from_bal: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        let to_bal: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&from_key, &(from_bal - amount));
        env.storage().persistent().set(&to_key, &(to_bal + amount));
    }
}
