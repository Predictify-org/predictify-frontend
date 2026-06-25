import { OnChainStream, ContractStreamStatus, InvariantResult } from "./types";

/**
 * Service-layer invariants consistent with on-chain escrow rules.
 * These checks must pass before the frontend allows a transaction to be submitted.
 */
export const EscrowInvariants = {
  /**
   * Settlement Invariant:
   * A stream can only be settled if it is ACTIVE or PAUSED and has 
   * an outstanding balance not yet released.
   */
  canSettle(stream: OnChainStream): InvariantResult {
    const validStatuses = [ContractStreamStatus.ACTIVE, ContractStreamStatus.PAUSED];
    
    if (!validStatuses.includes(stream.status)) {
      return { isValid: false, error: "Stream is not in a settlable state (Must be Active or Paused)." };
    }

    if (stream.released_amount >= stream.total_amount) {
      return { isValid: false, error: "Funds already fully released." };
    }

    return { isValid: true };
  },

  /**
   * Withdrawal Invariant:
   * A recipient can only withdraw if the stream is SETTLED and 
   * there are funds in the escrow hold that haven't been claimed.
   */
  canWithdraw(stream: OnChainStream): InvariantResult {
    if (stream.status !== ContractStreamStatus.SETTLED) {
      return { isValid: false, error: "Contract must be SETTLED before withdrawal is permitted." };
    }

    const withdrawable = stream.total_amount - stream.released_amount;
    if (withdrawable <= 0n) {
      return { isValid: false, error: "No remaining funds available for withdrawal." };
    }

    return { isValid: true };
  },

  /**
   * Balance & Release Invariant:
   * Verify that amounts are non-negative and that the released amount
   * does not exceed the total escrowed amount.
   */
  validateBalances(stream: OnChainStream): InvariantResult {
    if (stream.total_amount < 0n) {
      return { isValid: false, error: "Total amount cannot be negative." };
    }
    if (stream.released_amount < 0n) {
      return { isValid: false, error: "Released amount cannot be negative." };
    }
    if (stream.released_amount > stream.total_amount) {
      return { isValid: false, error: "Released amount cannot exceed total amount." };
    }
    return { isValid: true };
  },

  /**
   * Security Note: No optimistic credit is permitted. 
   * Always fetch fresh on-chain state via RPC before validating these invariants.
   */
};