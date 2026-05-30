/**
 * recipient-withdraw.ts
 *
 * Implements the `withdraw` entrypoint that lets a stream recipient claim
 * the currently vested-but-unreleased balance.
 *
 * This module mirrors the Soroban contract entrypoint described in issue #253:
 *
 *   withdraw(env, stream_id, amount: Option<i128>) -> i128
 *
 * ## Authorization
 * Only the stream recipient may withdraw. The caller's wallet address is
 * verified against `stream.recipientAddress` (the on-chain recipient).
 * This mirrors `recipient.require_auth()` in the Soroban contract.
 *
 * ## Withdrawable amount
 * withdrawable = vested_amount - released_amount
 *
 * - `amount = None`  → withdraw the full withdrawable balance.
 * - `amount = Some(n)` → withdraw exactly n; rejected if n > withdrawable.
 * - `amount = 0`     → rejected (no-op withdrawal).
 *
 * ## State transitions
 * After a successful withdrawal:
 *   - `released_amount` is incremented by the paid-out amount.
 *   - `last_update` is set to now.
 *   - If `released_amount >= total_amount` AND the stream is at/past its
 *     end_time, status transitions to `ended` (fully drained).
 *   - Cancelled / already-withdrawn streams with no remaining balance are
 *     rejected with `NO_WITHDRAWABLE_BALANCE`.
 *
 * ## Invariant
 * released_amount NEVER exceeds vested_amount after this operation.
 *
 * ## Amounts
 * All values are i128 raw units (stroops for XLM, smallest unit for any
 * SEP-41 token). No per-decimal conversion is performed here.
 */

import type { Stream } from "@/app/types/openapi";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Input to the withdraw computation. All amounts are i128 raw units. */
export interface WithdrawInput {
  /** Total amount locked in escrow when the stream was created. */
  totalAmount: bigint;
  /** Amount already released to the recipient before this withdrawal. */
  releasedAmount: bigint;
  /**
   * Amount vested (earned) by the recipient up to `now`.
   * Computed by the vesting/release schedule off-chain or from the
   * Soroban contract's `vested_amount` storage key.
   */
  vestedAmount: bigint;
  /**
   * Requested withdrawal amount (raw i128 units).
   * `undefined` / `null` → withdraw the full withdrawable balance (Option::None).
   */
  requestedAmount?: bigint | null;
  /** SEP-41 token address — used for the transfer leg. */
  token: string;
  /** Wallet address of the stream recipient (must match caller). */
  recipientAddress: string;
  /** Wallet address of the caller — must equal recipientAddress. */
  callerAddress: string;
  /** ISO-8601 stream end time. Used to decide Ended transition. */
  endTime?: string;
  /** Current timestamp (injectable for testing). */
  now: Date;
}

/** Result of a successful withdrawal computation. */
export interface WithdrawResult {
  /** Raw i128 units actually paid out. */
  amountPaidOut: bigint;
  /** New released_amount after this withdrawal. */
  newReleasedAmount: bigint;
  /** Whether the stream should transition to Ended (fully drained at/after end_time). */
  shouldMarkEnded: boolean;
}

export type WithdrawOutcome =
  | { ok: true;  result: WithdrawResult }
  | { ok: false; code: WithdrawErrorCode; message: string };

export type WithdrawErrorCode =
  | "RECIPIENT_AUTH_REQUIRED"   // caller is not the recipient
  | "NO_WITHDRAWABLE_BALANCE"   // vested_amount - released_amount === 0
  | "OVER_WITHDRAW"             // requested > withdrawable
  | "ZERO_AMOUNT"               // requested amount is 0
  | "INVALID_STREAM_STATE"      // stream is cancelled/withdrawn with no balance
  | "INVALID_ESCROW_STATE";     // amounts violate the invariant

/** Stream statuses that block withdrawal entirely. */
const BLOCKED_STATUSES = new Set<Stream["status"]>(["withdrawn", "cancelled"]);

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Compute the withdrawal for a recipient.
 *
 * Pure function — no side effects. The route handler is responsible for:
 *   1. Calling this function.
 *   2. Executing the token transfer via the SEP-41 token client.
 *   3. Persisting the updated stream record.
 *   4. Writing the audit log entry.
 *
 * @param stream  Current stream record (read-only).
 * @param input   Withdrawal parameters.
 * @returns       WithdrawOutcome — ok or error with code + message.
 */
export function computeWithdraw(
  stream: Pick<Stream, "status">,
  input: WithdrawInput,
): WithdrawOutcome {
  const {
    totalAmount,
    releasedAmount,
    vestedAmount,
    requestedAmount,
    recipientAddress,
    callerAddress,
    endTime,
    now,
  } = input;

  // ── 1. Recipient auth (require_auth equivalent) ───────────────────────────
  if (!callerAddress || callerAddress !== recipientAddress) {
    return {
      ok: false,
      code: "RECIPIENT_AUTH_REQUIRED",
      message:
        "Only the stream recipient may withdraw vested funds. " +
        `Expected '${recipientAddress}', got '${callerAddress ?? "none"}'.`,
    };
  }

  // ── 2. State guard ────────────────────────────────────────────────────────
  if (BLOCKED_STATUSES.has(stream.status)) {
    return {
      ok: false,
      code: "INVALID_STREAM_STATE",
      message: `Stream is in terminal state '${stream.status}' — no funds available for withdrawal.`,
    };
  }

  // ── 3. Escrow invariant validation ────────────────────────────────────────
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

  // ── 4. Compute withdrawable ───────────────────────────────────────────────
  //   withdrawable = vested_amount - released_amount
  const withdrawable = vestedAmount - releasedAmount;

  if (withdrawable === 0n) {
    return {
      ok: false,
      code: "NO_WITHDRAWABLE_BALANCE",
      message: "No vested funds are available for withdrawal at this time.",
    };
  }

  // ── 5. Resolve requested amount ───────────────────────────────────────────
  //   None → full withdrawable (Option::None in Soroban)
  //   Some(0) → rejected
  //   Some(n > withdrawable) → rejected (over-withdraw)
  const amountToWithdraw =
    requestedAmount === undefined || requestedAmount === null
      ? withdrawable          // withdraw all
      : requestedAmount;

  if (amountToWithdraw === 0n) {
    return {
      ok: false,
      code: "ZERO_AMOUNT",
      message: "Withdrawal amount must be greater than zero.",
    };
  }

  if (amountToWithdraw > withdrawable) {
    return {
      ok: false,
      code: "OVER_WITHDRAW",
      message:
        `Requested amount (${amountToWithdraw}) exceeds withdrawable balance (${withdrawable}). ` +
        `released_amount would never exceed vested_amount.`,
    };
  }

  // ── 6. Compute new state ──────────────────────────────────────────────────
  const newReleasedAmount = releasedAmount + amountToWithdraw;

  // Transition to Ended when fully drained at/after end_time.
  const fullyDrained = newReleasedAmount >= totalAmount;
  const pastEndTime  = endTime ? now.getTime() >= new Date(endTime).getTime() : false;
  const shouldMarkEnded = fullyDrained && pastEndTime;

  return {
    ok: true,
    result: {
      amountPaidOut:    amountToWithdraw,
      newReleasedAmount,
      shouldMarkEnded,
    },
  };
}

// ── Mock escrow resolver ──────────────────────────────────────────────────────

/**
 * Resolve the current on-chain escrow state for a stream.
 *
 * In production this queries the Soroban contract storage for:
 *   - total_amount
 *   - released_amount
 *   - vested_amount (computed by the release schedule at `now`)
 *
 * The mock uses values stored on the stream record (set at creation time).
 * All amounts are i128 raw units.
 */
export function resolveEscrowState(stream: Stream, now: Date): {
  totalAmount:    bigint;
  releasedAmount: bigint;
  vestedAmount:   bigint;
} {
  const total    = BigInt((stream as any).totalAmount    as string ?? "0");
  const released = BigInt((stream as any).releasedAmount as string ?? "0");

  // Mock vesting: linear from 0 to total over the stream's lifetime.
  // In production: call the Soroban contract's release_schedule module.
  const createdAt = new Date(stream.createdAt).getTime();
  const nowMs     = now.getTime();
  const elapsed   = Math.max(0, nowMs - createdAt);
  const duration  = 30 * 24 * 60 * 60 * 1000; // 30 days default
  const ratio     = Math.min(1, elapsed / duration);
  const vested    = BigInt(Math.floor(Number(total) * ratio));

  return { totalAmount: total, releasedAmount: released, vestedAmount: vested };
}
