/**
 * Claim eligibility data model.
 *
 * These types describe the user-visible eligibility of a prediction-market
 * winnings claim, derived deterministically from authoritative evidence (the
 * on-chain / oracle resolution of a market plus the connected user's recorded
 * position). The model is intentionally serializable so it can be returned from
 * an API route (`app/api/claim-eligibility/route.ts`) or derived purely from
 * contract events.
 *
 * The structure mirrors `types/oracle-status.ts` on purpose: eligibility, like
 * oracle freshness, must surface loading, error, retry, stale, and permission
 * states without ever losing the last-good user data.
 */

/** Lifecycle status of a claim as recorded by the authoritative source. */
export type ClaimStatus = "available" | "claimed" | "pending" | "disputed";

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  "available",
  "claimed",
  "pending",
  "disputed",
] as const;

/**
 * The final, user-facing eligibility decision.
 *
 * - `eligible`                — user's position matched the resolved outcome and
 *                               the claim is ready to be settled.
 * - `ineligible_wrong_outcome`— the resolved outcome differed from the user's
 *                               recorded position.
 * - `ineligible_unresolved`   — no authoritative outcome has been published yet,
 *                               so eligibility cannot be determined.
 * - `already_claimed`         — the claim has already been settled for this user.
 * - `pending`                 — the claim is in a pending settlement state.
 * - `disputed`                — the claim is under dispute and is frozen.
 * - `unknown`                 — the evidence was missing/ambiguous and cannot be
 *                               trusted (no claim may be made).
 */
export type ClaimEligibilityDecision =
  | "eligible"
  | "ineligible_wrong_outcome"
  | "ineligible_unresolved"
  | "already_claimed"
  | "pending"
  | "disputed"
  | "unknown";

/** Where the authoritative evidence originated. */
export type ClaimEvidenceSource = "oracle" | "chain" | "fallback" | "unknown";

export const CLAIM_EVIDENCE_SOURCES: readonly ClaimEvidenceSource[] = [
  "oracle",
  "chain",
  "fallback",
  "unknown",
] as const;

/** How fresh the authoritative evidence is (mirrors OracleFreshness). */
export type ClaimEligibilityFreshness = "fresh" | "stale" | "unknown";

export interface ClaimEligibilityFreshnessOptions {
  /**
   * Age (ms) at or above which authoritative evidence is considered stale.
   * Defaults to 24 hours.
   */
  staleAfterMs?: number;
}

/**
 * A single authoritative claim-evidence record for a (market, user) pair.
 *
 * `outcome` and `userPrediction` are compared case-insensitively and trimmed,
 * so whitespace/casing differences do not change the decision. An empty
 * `outcome` means the market has not been authoritatively resolved yet.
 *
 * `resolvedAt` is epoch milliseconds when the evidence was recorded; `0` (or a
 * non-positive value) means the timestamp is unknown.
 */
export interface ClaimEvidence {
  marketId: string;
  outcome: string;
  userPrediction: string;
  resolvedAt: number;
  source: ClaimEvidenceSource;
  claimed: boolean;
  claimStatus: ClaimStatus;
  winnings: number;
  winningsToken: string;
  marketTitle?: string;
}

/** The derived, user-visible eligibility result. */
export interface ClaimEligibility {
  decision: ClaimEligibilityDecision;
  /** Whether the user may currently settle this claim. */
  canClaim: boolean;
  /** Human-readable explanation of the decision (safe to display). */
  reason: string;
  freshness: ClaimEligibilityFreshness;
  evidenceSource: ClaimEvidenceSource;
  /** Whether the user's position matched the resolved outcome. */
  matched: boolean;
  resolvedAt: number | null;
  winnings: number;
  winningsToken: string;
  marketId: string;
}
