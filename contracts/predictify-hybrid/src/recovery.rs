use soroban_sdk::{contracttype, panic_with_error, symbol_short, Address, Env, Vec};
use crate::{storage, ContractError, DataKey, Market, MarketStatus};

/// Maximum number of markets that may be passed to a single recovery
/// call.  This bounds the plan size and prevents resource exhaustion.
pub const MAX_RECOVERY_MARKETS: u32 = 10;

/// Maximum number of individual balance mutations a single plan may
/// contain.  Exceeding this returns [`ContractError::PlanTooLarge`].
pub const MAX_BALANCE_MUTATIONS: u32 = 100;

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

/// A single balance change for one participant in one market.
///
/// `before` is the balance before the recovery action; `after` is
/// always 0 (the balance after the participant's funds are recovered).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BalanceMutation {
    pub market_id: u64,
    pub participant: Address,
    pub before: i128,
    pub after: i128,
}

/// One summary entry per recovered market, mirroring the events that
/// would be (or were) emitted during the apply phase.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RecoveryEvent {
    pub market_id: u64,
    pub total_recovered: i128,
    pub num_participants: u32,
}

/// A preview of what a recovery action will do.
///
/// When obtained via [`Recovery::dry_run`] no storage is mutated and no
/// events are emitted.  When obtained via [`Recovery::apply`] the same
/// plan is returned *after* the mutations have been applied, so the
/// caller can compare the plan with the actual before/after state.
///
/// All lists are deterministically ordered: markets are sorted by ID
/// ascending; balance mutations are sorted by market ID and then by
/// participant address lexicographically (based on the byte
/// representation of the address).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RecoveryPlan {
    /// Market IDs that would be (or were) recovered.
    pub markets_recovered: Vec<u64>,
    /// Per-participant before/after balances.
    pub balances_mutated: Vec<BalanceMutation>,
    /// One summary entry per recovered market that had a non-zero
    /// recovery amount.
    pub events_summary: Vec<RecoveryEvent>,
    /// Cumulative tokens recovered across all markets.
    pub total_tokens_recovered: i128,
}

// ---------------------------------------------------------------------------
// Recovery entry points (dry-run vs apply)
// ---------------------------------------------------------------------------

/// Entry points for recovery dry-run and apply.
pub struct Recovery;

impl Recovery {
    /// Preview a recovery **without** modifying storage or emitting events.
    ///
    /// Requires the same authorization as [`Recovery::apply`] (admin
    /// authentication).  The returned plan is structurally identical to
    /// what `apply` would produce for the same inputs.
    pub fn dry_run(env: &Env, market_ids: &Vec<u64>) -> RecoveryPlan {
        match recover_internal(env, market_ids, false) {
            Ok(plan) => plan,
            Err(e) => panic_with_error!(env, e),
        }
    }

    /// Execute a recovery, mutating storage and emitting events, and
    /// return a plan describing exactly what changed.
    ///
    /// The plan is built *before* any writes occur, so a caller can
    /// diff the returned plan against the before/after state to verify
    /// correctness.
    pub fn apply(env: &Env, market_ids: &Vec<u64>) -> RecoveryPlan {
        match recover_internal(env, market_ids, true) {
            Ok(plan) => plan,
            Err(e) => panic_with_error!(env, e),
        }
    }
}

// ---------------------------------------------------------------------------
// Shared implementation
// ---------------------------------------------------------------------------

/// Internal: build a [`RecoveryPlan`] without side effects, then if
/// `commit` is true replay the plan against storage and emit events.
///
/// Because the plan is always constructed first and applying it is a
/// pure replay of the plan, the dry-run and apply code paths are
/// identical by construction — they cannot drift.
fn recover_internal(
    env: &Env,
    market_ids: &Vec<u64>,
    commit: bool,
) -> Result<RecoveryPlan, ContractError> {
    // ---- input validation ----

    let count = market_ids.len();
    if count > MAX_RECOVERY_MARKETS {
        return Err(ContractError::TooManyMarkets);
    }

    // ---- Phase 1: build plan (no side effects) ----

    // Sort market IDs for deterministic ordering.  The caller may pass
    // IDs in any order; we always process them in ascending ID order.
    let sorted_ids = sort_ids(env, market_ids);
    let current_ledger = env.ledger().sequence();

    let mut markets_recovered: Vec<u64> = Vec::new(env);
    let mut balances_mutated: Vec<BalanceMutation> = Vec::new(env);
    let mut events_summary: Vec<RecoveryEvent> = Vec::new(env);
    let mut total_tokens_recovered: i128 = 0;
    let mut balance_count: u32 = 0;

    // Iterate over sorted market IDs.  Index is guaranteed < len().
    let mut mi: u32 = 0;
    while mi < sorted_ids.len() {
        let market_id = sorted_ids.get(mi).unwrap();

        // Read market; skip silently if it doesn't exist.
        let market = match storage::persistent_get::<Market>(env, &DataKey::Market(market_id)) {
            Some(m) => m,
            None => {
                mi += 1;
                continue;
            }
        };

        // Only recover markets that are active AND past expiration.
        if !market.is_recoverable(current_ledger) {
            mi += 1;
            continue;
        }

        // Read and sort participants for deterministic ordering within
        // the same market.
        let participants: Vec<Address> =
            storage::persistent_get(env, &DataKey::Participants(market_id))
                .unwrap_or_else(|| Vec::new(env));

        let sorted_participants = sort_addresses(env, &participants);

        let mut market_total: i128 = 0;
        let mut market_participant_count: u32 = 0;

        // Index is guaranteed < sorted_participants.len().
        let mut pj: u32 = 0;
        while pj < sorted_participants.len() {
            let participant = sorted_participants.get(pj).unwrap();
            let before: i128 =
                storage::persistent_get(env, &DataKey::Balance(market_id, participant.clone()))
                    .unwrap_or(0);

            if before > 0 {
                // Bounded-size check: the number of balance entries in
                // the plan must not exceed MAX_BALANCE_MUTATIONS.
                balance_count += 1;
                if balance_count > MAX_BALANCE_MUTATIONS {
                    return Err(ContractError::PlanTooLarge);
                }

                balances_mutated.push_back(BalanceMutation {
                    market_id,
                    participant: participant.clone(),
                    before,
                    after: 0,
                });

                market_total = market_total
                    .checked_add(before)
                    .ok_or(ContractError::Overflow)?;
                market_participant_count += 1;
            }
            pj += 1;
        }

        // Market is always added to recovered list — its status changes
        // to Expired even if no participants had balances.
        markets_recovered.push_back(market_id);

        if market_participant_count > 0 {
            events_summary.push_back(RecoveryEvent {
                market_id,
                total_recovered: market_total,
                num_participants: market_participant_count,
            });
            total_tokens_recovered = total_tokens_recovered
                .checked_add(market_total)
                .ok_or(ContractError::Overflow)?;
        }

        mi += 1;
    }

    let plan = RecoveryPlan {
        markets_recovered,
        balances_mutated,
        events_summary,
        total_tokens_recovered,
    };

    // ---- Phase 2: apply side effects if commit is true ----

    if commit {
        apply_plan(env, &plan)?;
    }

    Ok(plan)
}

/// Replay a [`RecoveryPlan`] against storage: mutate market statuses,
/// clear participant balances, and emit events.
///
/// This function is the *only* place where storage writes and event
/// emissions happen during recovery.  It is called only when `commit`
/// was true, ensuring a clean split between plan-building and
/// plan-execution.
fn apply_plan(env: &Env, plan: &RecoveryPlan) -> Result<(), ContractError> {
    // Update market statuses to Expired.
    let mut ai: u32 = 0;
    while ai < plan.markets_recovered.len() {
        let market_id = plan.markets_recovered.get(ai).unwrap();
        let mut market: Market =
            storage::persistent_get(env, &DataKey::Market(market_id))
                .ok_or(ContractError::MarketNotFound)?;
        market.status = MarketStatus::Expired;
        storage::persistent_set(env, &DataKey::Market(market_id), &market);
        ai += 1;
    }

    // Clear participant balances.
    let mut bi: u32 = 0;
    while bi < plan.balances_mutated.len() {
        let mutation = plan.balances_mutated.get(bi).unwrap();
        storage::persistent_set(
            env,
            &DataKey::Balance(mutation.market_id, mutation.participant.clone()),
            &0i128,
        );
        bi += 1;
    }

    // Emit one event per recovered market.
    let mut ei: u32 = 0;
    while ei < plan.events_summary.len() {
        let event = plan.events_summary.get(ei).unwrap();
        env.events().publish(
            (symbol_short!("predict"), symbol_short!("recover")),
            (event.market_id, event.total_recovered, event.num_participants),
        );
        ei += 1;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Deterministic ordering helpers
// ---------------------------------------------------------------------------

/// Returns a new `Vec<u64>` containing the same elements as `ids` but
/// sorted in ascending order (insertion sort).
///
/// Insertion sort is chosen because `n` is bounded by
/// `MAX_RECOVERY_MARKETS` (<= 10), so O(n²) is fine and the algorithm
/// is simple to implement without `core::sort` in `no_std`.
fn sort_ids(env: &Env, ids: &Vec<u64>) -> Vec<u64> {
    let n = ids.len();
    let mut sorted: Vec<u64> = Vec::new(env);
    {
        let mut si: u32 = 0;
        // Copy elements — index is guaranteed < n.
        while si < n {
            sorted.push_back(ids.get(si).unwrap());
            si += 1;
        }
    }
    // Insertion sort
    {
        let mut i: u32 = 1;
        while i < n {
            // get(i) is safe: i < n
            let key = sorted.get(i).unwrap();
            let mut j = i;
            // get(j-1) is safe: j > 0 and j <= i < n
            while j > 0 && sorted.get(j - 1).unwrap() > key {
                let larger = sorted.get(j - 1).unwrap();
                // set(j, larger): safe because j <= i < n
                sorted.set(j, larger);
                j -= 1;
            }
            // set(j, key): safe because j <= i < n
            sorted.set(j, key);
            i += 1;
        }
    }
    sorted
}

/// Returns a new `Vec<Address>` containing the same elements as `addrs`
/// but sorted in lexicographic (byte-level) ascending order.
///
/// The ordering follows the `Ord` implementation of `Address` (bytewise
/// comparison of the underlying `BytesN<32>`), which provides a total
/// order even if it is not semantically meaningful.
fn sort_addresses(env: &Env, addrs: &Vec<Address>) -> Vec<Address> {
    let n = addrs.len();
    let mut sorted: Vec<Address> = Vec::new(env);
    {
        let mut si: u32 = 0;
        while si < n {
            sorted.push_back(addrs.get(si).unwrap());
            si += 1;
        }
    }
    // Insertion sort
    {
        let mut i: u32 = 1;
        while i < n {
            let key = sorted.get(i).unwrap();
            let mut j = i;
            while j > 0 && sorted.get(j - 1).unwrap() > key {
                let larger = sorted.get(j - 1).unwrap();
                sorted.set(j, larger);
                j -= 1;
            }
            sorted.set(j, key);
            i += 1;
        }
    }
    sorted
}
