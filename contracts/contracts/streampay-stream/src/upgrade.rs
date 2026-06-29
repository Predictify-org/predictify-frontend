//! # Two-step, timelocked contract upgrades
//!
//! A WASM upgrade is one of the most powerful — and dangerous — admin
//! operations: it can rewrite every entrypoint. To give stakeholders time to
//! react to (and, if necessary, exit ahead of) a malicious or buggy upgrade,
//! upgrades go through a **two-step timelock**:
//!
//! 1. `propose_upgrade(admin, new_wasm_hash)` records the target hash and an
//!    `execute_after` timestamp = `now + TIMELOCK_SECONDS`.
//! 2. After the timelock elapses, `execute_upgrade(admin)` applies the
//!    previously-proposed hash. It refuses to run early or with a mismatched
//!    hash.
//!
//! A proposal can be withdrawn with `cancel_upgrade(admin)` at any time before
//! execution. Only one proposal may be pending at a time.
//!
//! All timestamp math is overflow-safe (`checked_add`), and the module never
//! `unwrap()`s in a production path.

use crate::error::Error;
use soroban_sdk::{contracttype, Address, BytesN, Env};

/// Mandatory delay between proposing and executing an upgrade: 48 hours.
pub const TIMELOCK_SECONDS: u64 = 48 * 60 * 60;

/// A pending, timelocked upgrade proposal.
#[derive(Clone)]
#[contracttype]
pub struct PendingUpgrade {
    /// The WASM hash that `execute_upgrade` will install.
    pub wasm_hash: BytesN<32>,
    /// Earliest ledger timestamp at which the upgrade may be executed.
    pub execute_after: u64,
}

/// Storage keys owned by the upgrade module.
#[derive(Clone)]
#[contracttype]
enum UpgradeKey {
    /// The single in-flight [`PendingUpgrade`], if any.
    Pending,
}

/// Records a new pending upgrade, computing its `execute_after` timestamp.
///
/// # Errors
/// - [`Error::InvalidState`] if an upgrade is already pending.
/// - [`Error::Overflow`] if `now + TIMELOCK_SECONDS` overflows `u64`.
pub fn propose(env: &Env, wasm_hash: BytesN<32>) -> Result<PendingUpgrade, Error> {
    if env.storage().instance().has(&UpgradeKey::Pending) {
        return Err(Error::InvalidState);
    }

    let now = env.ledger().timestamp();
    let execute_after = now.checked_add(TIMELOCK_SECONDS).ok_or(Error::Overflow)?;

    let pending = PendingUpgrade {
        wasm_hash,
        execute_after,
    };
    env.storage().instance().set(&UpgradeKey::Pending, &pending);
    Ok(pending)
}

/// Returns the pending upgrade, if any.
pub fn get_pending(env: &Env) -> Option<PendingUpgrade> {
    env.storage().instance().get(&UpgradeKey::Pending)
}

/// Validates that the pending upgrade is ready to execute and clears it.
///
/// On success the pending entry is removed and the validated WASM hash is
/// returned for the caller to apply via `update_current_contract_wasm`.
///
/// # Errors
/// - [`Error::NotFound`] if no upgrade is pending.
/// - [`Error::InvalidState`] if the timelock has not yet elapsed.
pub fn consume_ready(env: &Env, now: u64) -> Result<BytesN<32>, Error> {
    let pending: PendingUpgrade = get_pending(env).ok_or(Error::NotFound)?;

    if now < pending.execute_after {
        return Err(Error::InvalidState);
    }

    env.storage().instance().remove(&UpgradeKey::Pending);
    Ok(pending.wasm_hash)
}

/// Cancels a pending upgrade.
///
/// # Errors
/// - [`Error::NotFound`] if no upgrade is pending.
pub fn cancel(env: &Env) -> Result<(), Error> {
    if !env.storage().instance().has(&UpgradeKey::Pending) {
        return Err(Error::NotFound);
    }
    env.storage().instance().remove(&UpgradeKey::Pending);
    Ok(())
}
