/**
 * Oracle freshness and fallback status data model.
 *
 * These types describe the user-visible state of the oracle resolution chain
 * for a market. The model mirrors the on-chain oracle concept in
 * `contracts/predictify-hybrid/src/oracles.rs` (primary + ordered fallbacks,
 * per-attempt results) and is intentionally serializable so it can be returned
 * from an API route or derived purely from contract events.
 */

export type OracleProviderId = "chainlink" | "switchboard" | "pyth";

export const ORACLE_PROVIDER_IDS: readonly OracleProviderId[] = [
  "chainlink",
  "switchboard",
  "pyth",
] as const;

/**
 * A single attempt in the oracle resolution chain.
 * `attempt` is 0-indexed: the primary oracle is 0, the first fallback is 1, etc.
 * `timestamp` is epoch milliseconds when the attempt was recorded (0 = unknown).
 */
export interface OracleAttemptResult {
  provider: OracleProviderId;
  attempt: number;
  success: boolean;
  outcome: string;
  timestamp: number;
}

export type OracleFreshness = "fresh" | "stale" | "unknown";

export interface OracleFallbackStatus {
  primaryProvider: OracleProviderId;
  resolvedProvider: OracleProviderId;
  usedFallback: boolean;
  attemptedProviders: OracleProviderId[];
  totalAttempts: number;
}

export type OracleResolutionSource = "oracle" | "fallback" | "unknown";

export interface OracleStatus {
  /** Which part of the chain produced the visible outcome. */
  source: OracleResolutionSource;
  freshness: OracleFreshness;
  /** Epoch ms of the most recent successful oracle confirmation, or null. */
  lastUpdatedAt: number | null;
  fallback: OracleFallbackStatus | null;
  /** The provider that produced the outcome, or null when unresolved. */
  provider: OracleProviderId | null;
  attempts: OracleAttemptResult[];
}

export interface OracleFreshnessOptions {
  /**
   * Age (ms) at or above which a successful oracle update is considered stale.
   * Defaults to 24 hours.
   */
  staleAfterMs?: number;
}
