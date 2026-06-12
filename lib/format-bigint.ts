/**
 * Formatting helpers for `bigint` token amounts.
 *
 * Stellar/Soroban token amounts are integer base units. The UI almost
 * always needs a decimal string with a configurable precision. These
 * helpers are intentionally side-effect free and do not depend on any
 * runtime library, so they are safe to call from server components,
 * route handlers, and the browser bundle alike.
 *
 * Nothing in this file is wired up to existing callers yet; it sits
 * alongside `apiClient.ts` to be opted-into incrementally.
 */

/** Default decimal places for Stellar-native assets (XLM, USDC, ...). */
export const DEFAULT_TOKEN_DECIMALS = 7;

/**
 * Convert a base-unit `bigint` amount to a decimal display string.
 *
 * @example
 *   formatBigInt(123_456_789n, 7) // "12.3456789"
 *   formatBigInt(1_000n, 7)       // "0.0001000"
 *   formatBigInt(0n)              // "0.0000000"
 *
 * @param amount  Base-unit amount.
 * @param decimals Number of decimal places (defaults to 7).
 * @returns Decimal string with exactly `decimals` fractional digits.
 */
export function formatBigInt(amount: bigint, decimals: number = DEFAULT_TOKEN_DECIMALS): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be a non-negative integer, got ${decimals}`);
  }

  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const sign = negative ? '-' : '';
  return decimals === 0 ? `${sign}${whole.toString()}` : `${sign}${whole.toString()}.${fractionStr}`;
}

/**
 * Parse a decimal display string back into a base-unit `bigint`.
 *
 * Returns `null` for malformed input rather than throwing — UI code
 * typically wants to render a validation message instead of crashing.
 */
export function parseBigInt(value: string, decimals: number = DEFAULT_TOKEN_DECIMALS): bigint | null {
  if (decimals < 0 || !Number.isInteger(decimals)) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) return null;

  const [, sign, whole, fractionRaw = ''] = match;
  if (fractionRaw.length > decimals) return null;
  const fraction = fractionRaw.padEnd(decimals, '0');
  const raw = BigInt(whole + fraction);
  return sign === '-' ? -raw : raw;
}
