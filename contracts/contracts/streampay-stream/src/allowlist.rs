//! # Per-organisation token allowlist
//!
//! The contract already supports a *global* token allow/deny list
//! (`storage::set_token_allowed`). This module layers a finer-grained,
//! **per-organisation** allowlist on top so a multi-tenant deployment can
//! restrict which tokens each org may stream.
//!
//! ## Semantics
//!
//! For a given `(org, token)` pair the entry is one of:
//! - **Absent** — the org has not configured this token. The org is treated as
//!   *unrestricted* for that token (subject to the global allowlist), preserving
//!   backwards-compatible behaviour for orgs that never opt in.
//! - **`true`** — explicitly allowed.
//! - **`false`** — explicitly blocked for that org, even if globally allowed.
//!
//! An org "opts in" to enforcement the first time it sets any entry: once an
//! org has set at least one token to `true`, tokens it has *not* allowed are
//! treated as blocked. This makes the allowlist a true whitelist for orgs that
//! use it, while leaving non-participating orgs unaffected.
//!
//! All reads/writes use persistent storage; no arithmetic is performed, so
//! there are no overflow concerns in this module.

use soroban_sdk::{contracttype, Address, Env};

/// Persistent storage keys owned by the per-org allowlist.
#[derive(Clone)]
#[contracttype]
enum OrgAllowKey {
    /// Explicit allow/deny entry for a single `(org, token)` pair.
    Token(Address, Address),
    /// Marker set once an org has enabled allowlist enforcement.
    Enabled(Address),
}

/// Sets whether `token` is allowed for `org`.
///
/// The first call with `allowed = true` for an org flips that org into
/// "enforced" mode (see module docs). Setting `allowed = false` records an
/// explicit block but does not, by itself, enable enforcement.
pub fn set_org_token_allowed(env: &Env, org: &Address, token: &Address, allowed: bool) {
    env.storage()
        .persistent()
        .set(&OrgAllowKey::Token(org.clone(), token.clone()), &allowed);

    if allowed {
        env.storage()
            .persistent()
            .set(&OrgAllowKey::Enabled(org.clone()), &true);
    }
}

/// Returns whether `org` has enabled allowlist enforcement.
pub fn is_org_enforced(env: &Env, org: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&OrgAllowKey::Enabled(org.clone()))
        .unwrap_or(false)
}

/// Returns the explicit entry for `(org, token)`, if any.
fn explicit_entry(env: &Env, org: &Address, token: &Address) -> Option<bool> {
    env.storage()
        .persistent()
        .get(&OrgAllowKey::Token(org.clone(), token.clone()))
}

/// Returns whether `token` is blocked for `org` under the per-org allowlist.
///
/// Resolution order:
/// 1. An explicit `false` entry blocks the token.
/// 2. An explicit `true` entry allows it.
/// 3. No entry: blocked iff the org is in enforced mode (whitelist semantics);
///    otherwise allowed.
pub fn is_org_token_blocked(env: &Env, org: &Address, token: &Address) -> bool {
    match explicit_entry(env, org, token) {
        Some(true) => false,
        Some(false) => true,
        None => is_org_enforced(env, org),
    }
}
