#![no_std]

mod auth;
mod recovery;
mod storage;

#[cfg(test)]
mod recovery_tests;

use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, Env, Vec};

/// Storage keys for the Predictify Hybrid contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Market(u64),
    Balance(u64, Address),
    Participants(u64),
}

/// Contract-wide errors.
///
/// Variant values start at 1 (0 is reserved for success in Soroban).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    NotInitialized = 1,
    Unauthorized = 2,
    MarketNotFound = 3,
    MarketNotExpired = 4,
    PlanTooLarge = 5,
    TooManyMarkets = 6,
    Overflow = 7,
}

/// Tracks the lifecycle status of a prediction market.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MarketStatus {
    Active,
    Resolved,
    Expired,
}

/// A prediction market.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Market {
    pub status: MarketStatus,
    pub expiration_ledger: u32,
}

impl Market {
    /// Returns true when the market is still active and has passed its
    /// expiration ledger, making it eligible for recovery.
    pub fn is_recoverable(&self, current_ledger: u32) -> bool {
        self.status == MarketStatus::Active && current_ledger >= self.expiration_ledger
    }
}

#[contract]
pub struct PredictifyHybrid;

#[contractimpl]
impl PredictifyHybrid {
    pub fn __constructor(env: Env, admin: Address) {
        storage::extend_instance_ttl(&env);
        storage::instance_set(&env, &DataKey::Admin, &admin);
    }

    /// Execute recovery on the given markets, mutating storage and
    /// emitting events.  Returns the [`RecoveryPlan`] describing what
    /// was changed.
    pub fn recover(env: Env, market_ids: Vec<u64>) -> recovery::RecoveryPlan {
        storage::extend_instance_ttl(&env);
        auth::require_admin(&env);
        recovery::Recovery::apply(&env, &market_ids)
    }

    /// Preview what recovery would do *without* mutating storage or
    /// emitting events.  The returned plan is structurally identical
    /// to what `recover` would return for the same inputs, so the
    /// caller can inspect it before committing.
    pub fn recover_dry_run(env: Env, market_ids: Vec<u64>) -> recovery::RecoveryPlan {
        storage::extend_instance_ttl(&env);
        auth::require_admin(&env);
        recovery::Recovery::dry_run(&env, &market_ids)
    }

    pub fn version() -> u32 {
        1
    }
}
