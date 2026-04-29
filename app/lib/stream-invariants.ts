/**
 * Stream Invariants Module
 * Pure functions to validate stream state consistency.
 * These can be used in both frontend validation and tests.
 */

export interface StreamState {
  deposited: number;
  withdrawn: number;
  escrow: number;
}

/**
 * Invariant: Sum of legs matches deposited amount.
 * Conservation of value: deposited = withdrawn + escrow
 */
export function checkConservationOfValue(state: StreamState): boolean {
  // Using a small epsilon for floating point math if needed,
  // but for Stellar/Soroban we usually use bigints or fixed precision.
  // Here we assume basic numbers with truncation handling elsewhere.
  return Math.abs(state.deposited - (state.withdrawn + state.escrow)) < 0.0000001;
}

/**
 * Invariant: Balances must never be negative.
 */
export function checkNonNegativeBalances(state: StreamState): boolean {
  return state.deposited >= 0 && state.withdrawn >= 0 && state.escrow >= 0;
}

/**
 * Invariant: Cannot release more than what is in escrow.
 */
export function checkSettleLimit(state: StreamState, amountToRelease: number): boolean {
  return amountToRelease <= state.escrow;
}

/**
 * Reducer-like function to model stream mutations safely.
 */
export function applyStreamEvent(
  state: StreamState,
  event: { type: 'deposit' | 'withdraw' | 'refund'; amount: number }
): StreamState {
  const newState = { ...state };
  
  switch (event.type) {
    case 'deposit':
      newState.deposited += event.amount;
      newState.escrow += event.amount;
      break;
    case 'withdraw':
      // In a real scenario, this would be guarded by logic.
      // For property tests, we apply it and check invariants.
      newState.withdrawn += event.amount;
      newState.escrow -= event.amount;
      break;
    case 'refund':
      newState.deposited -= event.amount;
      newState.escrow -= event.amount;
      break;
  }
  
  return newState;
}
