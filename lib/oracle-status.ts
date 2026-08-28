/**
 * Pure, deterministic derivation of oracle freshness and fallback status.
 *
 * This module contains no I/O and no clock dependency other than the `now`
 * value passed in, so every function is fully testable and side-effect free.
 * Invalid or duplicate inputs are rejected with `OracleStatusInputError`
 * rather than silently coerced, which keeps callers' state machines honest.
 */

import {
  ORACLE_PROVIDER_IDS,
  type OracleAttemptResult,
  type OracleFreshness,
  type OracleFreshnessOptions,
  type OracleProviderId,
  type OracleStatus,
} from "@/types/oracle-status";

/** Default freshness threshold: a confirmation older than this is "stale". */
export const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export const ORACLE_PROVIDER_LABELS: Record<OracleProviderId, string> = {
  chainlink: "Chainlink",
  switchboard: "Switchboard",
  pyth: "Pyth",
};

export type OracleStatusInputErrorReason =
  | "invalid_shape"
  | "invalid_provider"
  | "invalid_attempt"
  | "duplicate_attempt"
  | "invalid_timestamp";

/** Thrown when oracle attempt data fails validation. */
export class OracleStatusInputError extends Error {
  readonly reason: OracleStatusInputErrorReason;

  constructor(message: string, reason: OracleStatusInputErrorReason) {
    super(message);
    this.name = "OracleStatusInputError";
    this.reason = reason;
  }
}

export function isValidOracleProviderId(
  value: unknown,
): value is OracleProviderId {
  return (
    typeof value === "string" &&
    (ORACLE_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

/**
 * Classify how fresh an oracle confirmation is.
 *
 * Boundary handling:
 * - null / non-finite / non-positive timestamps are "unknown" (no signal).
 * - a future timestamp (clock skew or bad data) is "unknown", never "fresh".
 */
export function classifyFreshness(
  lastUpdatedAt: number | null,
  now: number,
  options: OracleFreshnessOptions = {},
): OracleFreshness {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  if (
    lastUpdatedAt === null ||
    !Number.isFinite(lastUpdatedAt) ||
    lastUpdatedAt <= 0
  ) {
    return "unknown";
  }

  if (!Number.isFinite(now) || now < lastUpdatedAt) {
    return "unknown";
  }

  return now - lastUpdatedAt <= staleAfterMs ? "fresh" : "stale";
}

/** The canonical "nothing is known yet" status. */
export function unknownOracleStatus(): OracleStatus {
  return {
    source: "unknown",
    freshness: "unknown",
    lastUpdatedAt: null,
    fallback: null,
    provider: null,
    attempts: [],
  };
}

function validateAttempt(
  attempt: unknown,
  index: number,
): asserts attempt is OracleAttemptResult {
  if (attempt === null || typeof attempt !== "object") {
    throw new OracleStatusInputError(
      `oracle attempt at index ${index} is not an object`,
      "invalid_shape",
    );
  }

  const candidate = attempt as Record<string, unknown>;

  if (!isValidOracleProviderId(candidate.provider)) {
    throw new OracleStatusInputError(
      `oracle attempt at index ${index} has invalid provider: ${String(
        candidate.provider,
      )}`,
      "invalid_provider",
    );
  }

  if (
    typeof candidate.attempt !== "number" ||
    !Number.isInteger(candidate.attempt) ||
    candidate.attempt < 0
  ) {
    throw new OracleStatusInputError(
      `oracle attempt at index ${index} has invalid attempt index`,
      "invalid_attempt",
    );
  }

  if (
    typeof candidate.timestamp !== "number" ||
    !Number.isFinite(candidate.timestamp) ||
    candidate.timestamp < 0
  ) {
    throw new OracleStatusInputError(
      `oracle attempt at index ${index} has invalid timestamp`,
      "invalid_timestamp",
    );
  }

  if (typeof candidate.success !== "boolean") {
    throw new OracleStatusInputError(
      `oracle attempt at index ${index} has non-boolean success`,
      "invalid_shape",
    );
  }
}

/**
 * Deterministically derive the user-visible oracle status from a list of
 * resolution-chain attempts.
 *
 * Invariants enforced:
 * - Every attempt is validated (provider, attempt index, timestamp, success).
 * - Duplicate attempt indices are rejected (chains are strictly 0..n-1).
 * - Attempts are sorted by index before resolution so the result is order
 *   independent.
 * - The first *successful* attempt wins; if its index > 0 the chain used a
 *   fallback.
 * - An empty list yields the canonical unknown status (not an error).
 */
export function deriveOracleStatus(
  attempts: OracleAttemptResult[],
  now: number,
  options: OracleFreshnessOptions = {},
): OracleStatus {
  if (!Array.isArray(attempts)) {
    throw new OracleStatusInputError(
      "oracle attempts must be an array",
      "invalid_shape",
    );
  }

  if (attempts.length === 0) {
    return unknownOracleStatus();
  }

  const seenAttempts = new Set<number>();
  for (let index = 0; index < attempts.length; index += 1) {
    validateAttempt(attempts[index], index);
    const attemptIndex = (attempts[index] as OracleAttemptResult).attempt;
    if (seenAttempts.has(attemptIndex)) {
      throw new OracleStatusInputError(
        `duplicate oracle attempt index: ${attemptIndex}`,
        "duplicate_attempt",
      );
    }
    seenAttempts.add(attemptIndex);
  }

  const sorted = [...attempts].sort(
    (a, b) => a.attempt - b.attempt,
  );

  const resolvedIndex = sorted.findIndex((attempt) => attempt.success);

  if (resolvedIndex === -1) {
    return {
      source: "unknown",
      freshness: "unknown",
      lastUpdatedAt: null,
      fallback: null,
      provider: null,
      attempts: sorted,
    };
  }

  const resolved = sorted[resolvedIndex];
  const usedFallback = resolvedIndex > 0;
  const attemptedProviders = sorted.map((attempt) => attempt.provider);

  return {
    source: usedFallback ? "fallback" : "oracle",
    freshness: classifyFreshness(resolved.timestamp, now, options),
    lastUpdatedAt: resolved.timestamp > 0 ? resolved.timestamp : null,
    fallback: {
      primaryProvider: sorted[0].provider,
      resolvedProvider: resolved.provider,
      usedFallback,
      attemptedProviders,
      totalAttempts: sorted.length,
    },
    provider: resolved.provider,
    attempts: sorted,
  };
}

/**
 * Human-readable relative time, deterministic and clock-injected for tests.
 * Returns "unknown" when no timestamp is available.
 */
export function formatOracleRelativeTime(
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
