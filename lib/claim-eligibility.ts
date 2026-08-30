/**
 * Pure, deterministic derivation of claim eligibility from authoritative
 * evidence.
 *
 * This module contains no I/O and no clock dependency other than the `now`
 * value passed in, so every function is fully testable and side-effect free.
 * Invalid inputs are rejected with `ClaimEligibilityInputError` rather than
 * silently coerced, which keeps callers' state machines honest.
 */

import {
  CLAIM_EVIDENCE_SOURCES,
  CLAIM_STATUSES,
  type ClaimEligibility,
  type ClaimEligibilityDecision,
  type ClaimEligibilityFreshness,
  type ClaimEligibilityFreshnessOptions,
  type ClaimEvidence,
  type ClaimEvidenceSource,
  type ClaimStatus,
} from "@/types/claim-eligibility";

/** Default freshness threshold: evidence older than this is "stale". */
export const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type ClaimEligibilityInputErrorReason =
  | "invalid_shape"
  | "invalid_market_id"
  | "invalid_timestamp"
  | "invalid_source"
  | "invalid_status"
  | "invalid_winnings"
  | "duplicate_market";

/** Thrown when claim-evidence data fails validation. */
export class ClaimEligibilityInputError extends Error {
  readonly reason: ClaimEligibilityInputErrorReason;

  constructor(message: string, reason: ClaimEligibilityInputErrorReason) {
    super(message);
    this.name = "ClaimEligibilityInputError";
    this.reason = reason;
  }
}

export function isValidClaimEvidenceSource(
  value: unknown,
): value is ClaimEvidenceSource {
  return (
    typeof value === "string" &&
    (CLAIM_EVIDENCE_SOURCES as readonly string[]).includes(value)
  );
}

export function isValidClaimStatus(value: unknown): value is ClaimStatus {
  return (
    typeof value === "string" &&
    (CLAIM_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normalize a prediction/outcome string for comparison: trim and lowercase.
 * `null`/`undefined` become the empty string so missing data compares
 * deterministically.
 */
export function normalizeOutcome(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Classify how fresh authoritative evidence is.
 *
 * Boundary handling (mirrors `classifyFreshness` in oracle-status):
 * - null / non-finite / non-positive timestamps are "unknown" (no signal).
 * - a future timestamp (clock skew or bad data) is "unknown", never "fresh".
 */
export function classifyClaimEvidenceFreshness(
  resolvedAt: number | null,
  now: number,
  options: ClaimEligibilityFreshnessOptions = {},
): ClaimEligibilityFreshness {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  if (
    resolvedAt === null ||
    !Number.isFinite(resolvedAt) ||
    resolvedAt <= 0
  ) {
    return "unknown";
  }

  if (!Number.isFinite(now) || now < resolvedAt) {
    return "unknown";
  }

  return now - resolvedAt <= staleAfterMs ? "fresh" : "stale";
}

/** The canonical "nothing can be determined yet" eligibility. */
export function unknownClaimEligibility(
  marketId = "",
): ClaimEligibility {
  return {
    decision: "unknown",
    canClaim: false,
    reason: "Authoritative evidence is unavailable for this claim.",
    freshness: "unknown",
    evidenceSource: "unknown",
    matched: false,
    resolvedAt: null,
    winnings: 0,
    winningsToken: "",
    marketId,
  };
}

function validateEvidence(
  evidence: unknown,
  index: number,
): asserts evidence is ClaimEvidence {
  if (evidence === null || typeof evidence !== "object") {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} is not an object`,
      "invalid_shape",
    );
  }

  const candidate = evidence as Record<string, unknown>;

  const marketId = typeof candidate.marketId === "string"
    ? candidate.marketId.trim()
    : "";
  if (!marketId) {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} has an empty marketId`,
      "invalid_market_id",
    );
  }

  if (
    typeof candidate.resolvedAt !== "number" ||
    !Number.isFinite(candidate.resolvedAt) ||
    candidate.resolvedAt < 0
  ) {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} has an invalid resolvedAt`,
      "invalid_timestamp",
    );
  }

  if (!isValidClaimEvidenceSource(candidate.source)) {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} has an invalid source: ${String(
        candidate.source,
      )}`,
      "invalid_source",
    );
  }

  if (!isValidClaimStatus(candidate.claimStatus)) {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} has an invalid claimStatus: ${String(
        candidate.claimStatus,
      )}`,
      "invalid_status",
    );
  }

  const winnings = candidate.winnings;
  if (
    typeof winnings !== "number" ||
    !Number.isFinite(winnings) ||
    winnings < 0
  ) {
    throw new ClaimEligibilityInputError(
      `claim evidence at index ${index} has invalid winnings`,
      "invalid_winnings",
    );
  }
}

/**
 * Deterministically derive the user-visible claim eligibility from a single
 * authoritative-evidence record.
 *
 * Invariants enforced:
 * - The evidence is fully validated (marketId, timestamp, source, status,
 *   winnings); invalid data throws rather than producing a misleading result.
 * - An empty `outcome` (market not yet resolved) yields `ineligible_unresolved`
 *   and is never claimable.
 * - `claimed` / `claimStatus: "claimed"` always wins over `available`, so a
 *   back-end inconsistency can never mark an already-settled claim as eligible.
 * - A dispute or pending settlement freezes the claim (not claimable).
 * - Evidence whose timestamp is unknown is treated as untrustworthy
 *   (`unknown`), never silently eligible.
 * - Outcome vs. prediction matching is case-insensitive and trimmed.
 */
export function deriveClaimEligibility(
  evidence: ClaimEvidence,
  now: number,
  options: ClaimEligibilityFreshnessOptions = {},
): ClaimEligibility {
  validateEvidence(evidence, 0);

  const marketId = evidence.marketId.trim();
  const outcome = normalizeOutcome(evidence.outcome);
  const prediction = normalizeOutcome(evidence.userPrediction);
  const matched = outcome.length > 0 && outcome === prediction;
  const freshness = classifyClaimEvidenceFreshness(
    evidence.resolvedAt,
    now,
    options,
  );
  const resolvedAt = evidence.resolvedAt > 0 ? evidence.resolvedAt : null;
  const settled = evidence.claimed || evidence.claimStatus === "claimed";

  let decision: ClaimEligibilityDecision;
  let canClaim = false;
  let reason: string;

  switch (evidence.claimStatus) {
    case "disputed":
      decision = "disputed";
      reason = "This claim is under dispute and is currently frozen.";
      break;
    case "pending":
      decision = "pending";
      reason = "This claim is pending settlement and cannot be claimed yet.";
      break;
    default:
      if (settled) {
        decision = "already_claimed";
        reason = "You have already claimed this reward.";
      } else if (freshness === "unknown") {
        decision = "unknown";
        reason = "Authoritative evidence is unavailable or not yet confirmed.";
      } else if (outcome.length === 0) {
        decision = "ineligible_unresolved";
        reason = "The market outcome has not been published yet.";
      } else if (!matched) {
        decision = "ineligible_wrong_outcome";
        reason = "Your prediction did not match the resolved outcome.";
      } else {
        decision = "eligible";
        canClaim = true;
        reason = `You are eligible to claim ${evidence.winnings} ${evidence.winningsToken}.`;
      }
  }

  return {
    decision,
    canClaim,
    reason,
    freshness,
    evidenceSource: evidence.source,
    matched,
    resolvedAt,
    winnings: evidence.winnings,
    winningsToken: evidence.winningsToken,
    marketId,
  };
}

/**
 * Derive eligibility for a list of evidence records.
 *
 * Rejects a non-array input and duplicate `marketId` values so callers cannot
 * silently lose one of two conflicting records. Every record is validated, so
 * a single bad entry fails the whole batch deterministically.
 */
export function deriveClaimEligibilities(
  evidences: ClaimEvidence[],
  now: number,
  options: ClaimEligibilityFreshnessOptions = {},
): ClaimEligibility[] {
  if (!Array.isArray(evidences)) {
    throw new ClaimEligibilityInputError(
      "claim evidences must be an array",
      "invalid_shape",
    );
  }

  const seen = new Set<string>();
  for (let index = 0; index < evidences.length; index += 1) {
    validateEvidence(evidences[index], index);
    const id = evidences[index].marketId.trim();
    if (seen.has(id)) {
      throw new ClaimEligibilityInputError(
        `duplicate claim evidence for market: ${id}`,
        "duplicate_market",
      );
    }
    seen.add(id);
  }

  return evidences.map((evidence) =>
    deriveClaimEligibility(evidence, now, options),
  );
}

/**
 * Human-readable relative time, deterministic and clock-injected for tests.
 * Returns "unknown" when no timestamp is available.
 */
export function formatClaimEligibilityRelativeTime(
  fromMs: number | null,
  nowMs: number,
): string {
  if (fromMs === null || !Number.isFinite(fromMs) || fromMs <= 0) {
    return "unknown";
  }

  const diff = nowMs - fromMs;
  if (!Number.isFinite(diff) || diff < 0) {
    return "just now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "just now";
  }
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }
  if (diff < 30 * day) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  }
  const months = Math.floor(diff / (30 * day));
  return `${months}mo ago`;
}
