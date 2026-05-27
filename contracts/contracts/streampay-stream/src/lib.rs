#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Symbol};

/// Represents the contract's admin and configuration state.
#[derive(Clone)]
#[contracttype]
pub struct State {
    /// The contract administrator (has authority to upgrade)
    pub admin: Address,
    /// Optional: contract version for reference
    pub version: u32,
    /// Flag: whether initialization has been completed
    pub initialized: bool,
}

/// Error codes for contract operations
#[derive(Copy, Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidWasmHash = 4,
}

impl ContractError {
    pub fn into_result(self) -> Result<(), ContractError> {
        Err(self)
    }
}

const STATE_KEY: &str = "STATE";
const VERSION: u32 = 1;

#[contract]
pub struct StreamPayStream;

#[contractimpl]
impl StreamPayStream {
    /// Initialize the contract with an admin address.
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `admin` - The wallet address that will have admin privileges
    /// 
    /// # Errors
    /// Returns `AlreadyInitialized` if called more than once.
    /// 
    /// # Events
    /// Emits "initialized" event with the admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        // Verify initialization hasn't already occurred
        let state: Option<State> = env.storage().instance().get(&Symbol::new(&env, STATE_KEY));
        if state.is_some() {
            return Err(ContractError::AlreadyInitialized);
        }

        // Create and store the initial state
        let new_state = State {
            admin: admin.clone(),
            version: VERSION,
            initialized: true,
        };

        env.storage().instance().set(&Symbol::new(&env, STATE_KEY), &new_state);
        env.storage().instance().extend_ttl(17280, 34560); // ~1 day

        // Emit initialization event
        env.events().publish(
            (Symbol::new(&env, "initialized"),),
            admin,
        );

        Ok(())
    }

    /// Constructor alias for initialization (called once on deployment).
    /// This is an alternative entry point that may be called by the deployer.
    pub fn __constructor(env: Env, admin: Address) -> Result<(), ContractError> {
        Self::initialize(env, admin)
    }

    /// Upgrade the contract to a new WASM implementation.
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `new_wasm_hash` - The SHA256 hash of the new WASM binary (32 bytes)
    /// 
    /// # Errors
    /// Returns `NotInitialized` if initialize() hasn't been called.
    /// Returns `Unauthorized` if caller is not the admin.
    /// 
    /// # Behavior
    /// - Requires admin authorization via env.require_auth() for the stored admin
    /// - Updates contract code to the new WASM
    /// - Preserves all existing Stream storage entries
    /// - Emits "upgraded" event with the new WASM hash
    /// 
    /// # Storage Migration
    /// The upgrade does not modify existing Stream entries. Any schema changes
    /// must be handled by:
    /// 1. A migration function called explicitly after upgrade, or
    /// 2. Backward-compatible schema design
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), ContractError> {
        // Verify contract is initialized
        let state: Option<State> = env.storage().instance().get(&Symbol::new(&env, STATE_KEY));
        let state = state.ok_or(ContractError::NotInitialized)?;

        // Require admin authorization
        state.admin.require_auth();

        // Update the contract WASM via the deployer interface
        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());

        // Emit upgraded event with the new WASM hash
        env.events().publish(
            (Symbol::new(&env, "upgraded"),),
            new_wasm_hash,
        );

        Ok(())
    }

    /// Retrieve the current contract state.
    /// 
    /// # Returns
    /// The current `State` struct containing admin, version, and initialization flag.
    /// 
    /// # Errors
    /// Returns `NotInitialized` if initialize() hasn't been called.
    pub fn get_state(env: Env) -> Result<State, ContractError> {
        let state: Option<State> = env.storage().instance().get(&Symbol::new(&env, STATE_KEY));
        state.ok_or(ContractError::NotInitialized)
    }

    /// Check if the contract has been initialized.
    /// 
    /// # Returns
    /// `true` if initialize() has been called, `false` otherwise.
    pub fn is_initialized(env: Env) -> bool {
        let state: Option<State> = env.storage().instance().get(&Symbol::new(&env, STATE_KEY));
        state.is_some()
    }

    /// Get the current admin address.
    /// 
    /// # Returns
    /// The admin `Address` if initialized.
    /// 
    /// # Errors
    /// Returns `NotInitialized` if initialize() hasn't been called.
    pub fn get_admin(env: Env) -> Result<Address, ContractError> {
        let state = Self::get_state(env)?;
        Ok(state.admin)
    }
}

#[cfg(test)]
mod tests;
