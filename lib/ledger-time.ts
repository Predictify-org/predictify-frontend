/**
 * Time helpers for Stellar ledger timestamps.
 *
 * Stellar contracts express timestamps as Unix epoch *seconds*, while
 * JavaScript's `Date` uses *milliseconds*. Mixing the two has been the
 * source of more than one production bug, so callers should funnel
 * conversions through this module.
 *
 * Added as a sibling helper; existing code paths are not yet rewired.
 */

/** Average Stellar ledger close time, in seconds. */
export const LEDGER_CLOSE_SECONDS = 5;

/**
 * Convert a contract-side Unix epoch seconds value to a JS `Date`.
 *
 * Returns `null` when the value is non-finite or negative so calling
 * code can branch on a missing/invalid timestamp.
 */
export function fromLedgerSeconds(seconds: number | bigint): Date | null {
  const n = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  if (!Number.isFinite(n) || n < 0) return null;
  return new Date(n * 1000);
}

/**
 * Convert a `Date` (or epoch milliseconds) to contract-side seconds.
 */
export function toLedgerSeconds(input: Date | number): number {
  const ms = input instanceof Date ? input.getTime() : input;
  return Math.floor(ms / 1000);
}

/**
 * Approximate elapsed ledger count between two epoch-seconds values.
 *
 * Intended for indexer backfill heuristics, not for cryptographic
 * accounting; ledger close times vary.
 */
export function ledgersBetween(startSeconds: number, endSeconds: number): number {
  if (endSeconds <= startSeconds) return 0;
  return Math.floor((endSeconds - startSeconds) / LEDGER_CLOSE_SECONDS);
}
