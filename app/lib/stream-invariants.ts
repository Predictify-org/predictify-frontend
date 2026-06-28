/**
 * @module stream-invariants
 *
 * Pure invariant validators for StreamPay stream state.
 *
 * These functions encode the escrow conservation laws that must hold at every
 * point in a stream's lifecycle. They are used in:
 * - Unit and property-based tests to assert correctness after mutations.
 * - Frontend validation before submitting on-chain transactions.
 * - Reconciliation jobs to detect on-chain/off-chain drift.
 *
 * ## Core invariants
 * 1. **Conservation of value:** `deposited === withdrawn + escrow`
 * 2. **Non-negative balances:** all balance fields ≥ 0
 * 3. **Settle limit:** amount to release ≤ current escrow balance
 * 4. **Vested amount bound:** 0 ≤ vestedAmount ≤ totalAmount (principal)
 *
 * ## Amounts
 * All values are treated as fixed-precision numbers. For Stellar/Soroban
 * production use, replace `number` with `bigint` and remove the epsilon
 * comparison in {@link checkConservationOfValue}.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Snapshot of a stream's balance legs.
 *
 * @property deposited - Total amount deposited into the stream escrow.
 * @property withdrawn - Total amount released to the recipient.
 * @property escrow    - Amount currently locked in escrow.
 */
export interface StreamState {
  deposited: number;
  withdrawn: number;
  escrow: number;
}

/**
 * Vested amount snapshot.
 *
 * @property vestedAmount - Amount that has vested (earned) at this moment.
 * @property totalAmount  - The principal (total amount locked at stream creation).
 */
export interface VestedState {
  vestedAmount: number;
  totalAmount: number;
}

// ── Invariant checks ──────────────────────────────────────────────────────────

/**
 * Invariant: conservation of value.
 *
 * Asserts that `deposited === withdrawn + escrow` (within floating-point
 * epsilon). This ensures no funds are created or destroyed by stream
 * operations.
 *
 * @param state - Current stream balance snapshot.
 * @returns     `true` if the invariant holds.
 *
 * @example
 * ```ts
 * checkConservationOfValue({ deposited: 100, withdrawn: 40, escrow: 60 }); // true
 * checkConservationOfValue({ deposited: 100, withdrawn: 40, escrow: 50 }); // false
 * ```
 */
export function checkConservationOfValue(state: StreamState): boolean {
  return Math.abs(state.deposited - (state.withdrawn + state.escrow)) < 0.0000001;
}

/**
 * Invariant: non-negative balances.
 *
 * Asserts that no balance leg is negative. A negative balance indicates
 * an over-withdrawal or accounting bug.
 *
 * @param state - Current stream balance snapshot.
 * @returns     `true` if all balances are ≥ 0.
 *
 * @example
 * ```ts
 * checkNonNegativeBalances({ deposited: 100, withdrawn: 40, escrow: 60 }); // true
 * checkNonNegativeBalances({ deposited: 100, withdrawn: 40, escrow: -1 }); // false
 * ```
 */
export function checkNonNegativeBalances(state: StreamState): boolean {
  return state.deposited >= 0 && state.withdrawn >= 0 && state.escrow >= 0;
}

/**
 * Invariant: settle amount does not exceed escrow balance.
 *
 * Asserts that `amountToRelease <= state.escrow`. Releasing more than the
 * escrow balance would create funds from nothing.
 *
 * @param state           - Current stream balance snapshot.
 * @param amountToRelease - Amount proposed for release in this settlement.
 * @returns               `true` if the settle is within bounds.
 *
 * @example
 * ```ts
 * checkSettleLimit({ deposited: 100, withdrawn: 0, escrow: 60 }, 60); // true
 * checkSettleLimit({ deposited: 100, withdrawn: 0, escrow: 60 }, 61); // false
 * ```
 */
export function checkSettleLimit(state: StreamState, amountToRelease: number): boolean {
  return amountToRelease <= state.escrow;
}

/**
 * Invariant: vested amount is always between 0 and totalAmount (principal), inclusive.
 *
 * Asserts that `0 ≤ vestedAmount ≤ totalAmount` at any time.
 *
 * @param state - Vested amount and total principal.
 * @returns     `true` if the invariant holds.
 *
 * @example
 * ```ts
 * checkVestedBound({ vestedAmount: 50, totalAmount: 100 }); // true
 * checkVestedBound({ vestedAmount: -1, totalAmount: 100 }); // false
 * checkVestedBound({ vestedAmount: 101, totalAmount: 100 }); // false
 * ```
 */
export function checkVestedBound(state: VestedState): boolean {
  return state.vestedAmount >= 0 && state.vestedAmount <= state.totalAmount;
}

// ── State reducer ─────────────────────────────────────────────────────────────

/**
 * Apply a stream event to a balance snapshot and return the new state.
 *
 * This is a pure reducer — it does not validate invariants. Callers should
 * run the invariant checks on the returned state.
 *
 * **Event types:**
 * - `deposit` — add funds to escrow (new stream or top-up).
 * - `withdraw` — move funds from escrow to withdrawn (recipient payout).
 * - `refund`   — remove funds from escrow and deposited (sender refund).
 *
 * @param state - Current stream balance snapshot.
 * @param event - Event to apply.
 * @returns     New stream balance snapshot (does not mutate `state`).
 *
 * @example
 * ```ts
 * const s0 = { deposited: 0, withdrawn: 0, escrow: 0 };
 * const s1 = applyStreamEvent(s0, { type: "deposit",  amount: 100 });
 * // { deposited: 100, withdrawn: 0, escrow: 100 }
 * const s2 = applyStreamEvent(s1, { type: "withdraw", amount: 40 });
 * // { deposited: 100, withdrawn: 40, escrow: 60 }
 * ```
 */
export function applyStreamEvent(
  state: StreamState,
  event: { type: "deposit" | "withdraw" | "refund"; amount: number },
): StreamState {
  const s = { ...state };
  switch (event.type) {
    case "deposit":
      s.deposited += event.amount;
      s.escrow    += event.amount;
      break;
    case "withdraw":
      s.withdrawn += event.amount;
      s.escrow    -= event.amount;
      break;
    case "refund":
      s.deposited -= event.amount;
      s.escrow    -= event.amount;
      break;
  }
  return s;
}

// ── Vested amount calculation ─────────────────────────────────────────────────

/**
 * Model function: calculate vested amount at a given time (linear vesting).
 *
 * This is a pure model of what the Soroban contract's `vested_amount` does.
 *
 * @param totalAmount  - Principal (total amount locked).
 * @param startTime    - Vesting start time (ms since epoch).
 * @param endTime      - Vesting end time (ms since epoch).
 * @param now          - Current time (ms since epoch).
 * @param pausedRanges - Array of [pausedAt, resumedAt] ranges (ms) when vesting was paused.
 * @returns            Vested amount.
 */
export function calculateVestedAmount(
  totalAmount: number,
  startTime: number,
  endTime: number,
  now: number,
  pausedRanges: Array<[number, number]> = [],
): number {
  // Clamp now
  const nowClamped = Math.max(startTime, Math.min(now, endTime));
  
  // Calculate total paused duration
  let totalPausedDuration = 0;
  for (const [pausedAt, resumedAt] of pausedRanges) {
    const effectivePausedStart = Math.max(startTime, pausedAt);
    const effectivePausedEnd = Math.min(endTime, Math.max(effectivePausedStart, resumedAt));
    totalPausedDuration += effectivePausedEnd - effectivePausedStart;
  }
  
  // Calculate elapsed time excluding paused duration
  const totalDuration = endTime - startTime;
  if (totalDuration <= 0) {
    return totalAmount;
  }
  
  const elapsed = Math.max(0, (nowClamped - startTime) - totalPausedDuration);
  
  // Vested = totalAmount * elapsed / totalDuration (truncated to avoid over-allocation)
  return Math.floor((totalAmount * elapsed) / totalDuration);
}
