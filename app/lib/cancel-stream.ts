/**
 * cancel_stream — refund-split engine
 *
 * Implements the cancel_stream entrypoint logic described in issue #255.
 *
 * ## Authorization
 * Either the stream sender OR a wallet holding the "canceller" role in the
 * stream's org policy may cancel. The API route enforces this via
 * `checkStreamOrgPolicy` before calling `computeCancellationSplit`.
 * In the Soroban contract this maps to `require_auth` on the caller.
 *
 * ## Refund split (escrow-conservation invariant)
 *
 *   recipient_payout = vested_amount - released_amount
 *   sender_refund    = total_amount  - vested_amount
 *
 *   recipient_payout + sender_refund === total_amount - released_amount
 *
 * The escrow is fully drained — no dust remains after cancellation.
 *
 * ## Amounts
 * All values are i128 raw units (stroops for XLM, smallest unit for any
 * SEP-41 token). No per-decimal conversion is performed here.
 *
 * ## Terminal-state guard
 * Cancelling an already Cancelled / Ended / Settled / Withdrawn stream is
 * rejected with ALREADY_TERMINAL to prevent double-refund.
 */

import type { Stream, CancellationSplit } from "@/app/types/openapi";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Input snapshot of the stream's on-chain escrow state at cancel time. */
export interface CancelInput {
  /** Total amount locked in escrow when the stream was created (raw i128). */
  totalAmount: bigint;
  /**
   * Amount already released to the recipient before this cancellation (raw i128).
   * Must satisfy: 0 ≤ releasedAmount ≤ vestedAmount ≤ totalAmount.
   */
  releasedAmount: bigint;
  /**
   * Amount vested (earned) by the recipient up to the cancellation timestamp
   * (raw i128). Computed by the vesting schedule off-chain or from the
   * Soroban contract's `vested_amount` storage key.
   */
  vestedAmount: bigint;
  /** SEP-41 token address — must match stream.token. */
  token: string;
  /** Wallet address of the stream sender (receives the refund leg). */
  senderAddress: string;
  /** Wallet address of the stream recipient (receives the payout leg). */
  recipientAddress: string;
}

/** Computed split — both legs and the conservation proof. */
export interface CancellationSplitResult {
  /** Raw i128 units to transfer to the recipient. May be 0n at t=start. */
  recipientPayout: bigint;
  /** Raw i128 units to refund to the sender. May be 0n at t=end. */
  senderRefund: bigint;
  /** Proves: recipientPayout + senderRefund === totalAmount - releasedAmount */
  escrowDrained: bigint;
}

export type CancelResult =
  | { ok: true; split: CancellationSplitResult }
  | { ok: false; code: CancelErrorCode; message: string };

export type CancelErrorCode =
  | "ALREADY_TERMINAL"      // stream is Cancelled / Ended / Settled / Withdrawn
  | "INVALID_ESCROW_STATE"  // amounts violate the invariant (contract bug guard)
  | "STREAM_NOT_CANCELLABLE"; // stream is in Draft — nothing escrowed yet

/** Statuses that cannot be cancelled (prevents double-refund). */
const TERMINAL_STATUSES = new Set<Stream["status"]>(["cancelled", "ended", "withdrawn"]);

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Compute the recipient payout and sender refund for a cancellation.
 *
 * This is a pure function — it does NOT mutate state or call the chain.
 * The API route is responsible for:
 *   1. Auth check (sender or canceller role).
 *   2. Calling this function.
 *   3. Executing both token transfers via `getTokenClientForStream`.
 *   4. Persisting the updated stream record.
 *
 * @throws never — all error paths return `{ ok: false }`.
 */
export function computeCancellationSplit(
  stream: Pick<Stream, "status">,
  input: CancelInput,
): CancelResult {
  // ── Terminal-state guard (prevents double-refund) ──────────────────────────
  if (TERMINAL_STATUSES.has(stream.status)) {
    return {
      ok: false,
      code: "ALREADY_TERMINAL",
      message: `Stream is already in terminal state '${stream.status}' and cannot be cancelled. Double-cancel rejected.`,
    };
  }

  if (stream.status === "draft") {
    return {
      ok: false,
      code: "STREAM_NOT_CANCELLABLE",
      message: "Draft streams have no escrowed funds. Start the stream before cancelling.",
    };
  }

  // ── Invariant validation (contract bug guard) ──────────────────────────────
  const { totalAmount, releasedAmount, vestedAmount } = input;

  if (
    releasedAmount < 0n ||
    vestedAmount < releasedAmount ||
    totalAmount < vestedAmount
  ) {
    return {
      ok: false,
      code: "INVALID_ESCROW_STATE",
      message:
        `Escrow invariant violated: expected 0 ≤ releasedAmount(${releasedAmount}) ` +
        `≤ vestedAmount(${vestedAmount}) ≤ totalAmount(${totalAmount}).`,
    };
  }

  // ── Split computation ──────────────────────────────────────────────────────
  //
  //   recipient_payout = vested_amount - released_amount
  //     → what the recipient earned but hasn't received yet
  //
  //   sender_refund    = total_amount  - vested_amount
  //     → the unvested remainder that goes back to the sender
  //
  //   Conservation check:
  //     recipient_payout + sender_refund
  //       = (vested - released) + (total - vested)
  //       = total - released                          ✓
  //
  const recipientPayout = vestedAmount - releasedAmount;
  const senderRefund    = totalAmount  - vestedAmount;
  const escrowDrained   = recipientPayout + senderRefund; // === totalAmount - releasedAmount

  return { ok: true, split: { recipientPayout, senderRefund, escrowDrained } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the `CancellationSplit` record that is persisted on the stream and
 * returned in the API response.
 */
export function buildCancellationRecord(
  input: CancelInput,
  split: CancellationSplitResult,
  recipientTxHash: string,
  senderTxHash: string | undefined,
): CancellationSplit {
  return {
    recipientPayout:  split.recipientPayout.toString(),
    senderRefund:     split.senderRefund.toString(),
    totalAmount:      input.totalAmount.toString(),
    alreadyReleased:  input.releasedAmount.toString(),
    token:            input.token,
    recipientTxHash,
    ...(senderTxHash ? { senderTxHash } : {}),
    cancelledAt:      new Date().toISOString(),
  };
}
