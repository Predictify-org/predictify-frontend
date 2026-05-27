/**
 * SEP-41 Token Allowlist
 *
 * Provides an optional admin-gated allowlist of accepted token addresses for
 * stream creation. When the allowlist is enabled (non-empty), any token not
 * present in the list is rejected at `create_stream` time — matching the
 * Soroban contract's `accepted_tokens` storage key behaviour described in
 * issue #258.
 *
 * Amounts are always i128 raw units; no per-decimal logic lives here.
 *
 * ## Design
 * - The allowlist is stored in-memory and seeded from the
 *   `ALLOWED_TOKENS` environment variable (comma-separated token strings).
 * - When `ALLOWED_TOKENS` is absent or empty the allowlist is **disabled**
 *   and every well-formed token is accepted (open mode).
 * - Admins can mutate the list at runtime via `addAllowedToken` /
 *   `removeAllowedToken` (e.g. from an internal admin route).
 *
 * Token format:
 *   - "XLM" or "native" → Stellar native lumens
 *   - "CODE:ISSUER"      → SEP-41 / Stellar Classic asset
 */

import { parseAssetString } from "./assets";

/** Normalise a token string to a canonical key used for set membership. */
export function normaliseToken(token: string): string {
  const t = token.trim();
  if (!t || t.toUpperCase() === "XLM" || t.toLowerCase() === "native") {
    return "XLM";
  }
  // Validate format — throws on malformed input.
  const asset = parseAssetString(t);
  return `${asset.code}:${asset.issuer}`;
}

// ── In-memory allowlist state ─────────────────────────────────────────────────

/**
 * The live allowlist set.  Each entry is a normalised token string.
 * An empty set means the allowlist is disabled (all valid tokens accepted).
 */
const _allowlist: Set<string> = new Set();

/** Seed from environment on module load. */
(function seedFromEnv() {
  const raw = process.env.ALLOWED_TOKENS ?? "";
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      _allowlist.add(normaliseToken(trimmed));
    } catch {
      // Ignore malformed env entries — log in production.
      console.warn(`[token-allowlist] Ignoring malformed ALLOWED_TOKENS entry: "${trimmed}"`);
    }
  }
})();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns `true` when the allowlist is active (has at least one entry).
 * When inactive every well-formed token is accepted.
 */
export function isAllowlistEnabled(): boolean {
  return _allowlist.size > 0;
}

/**
 * Returns a snapshot of the current allowlist entries.
 * Returns an empty array when the allowlist is disabled.
 */
export function getAllowedTokens(): string[] {
  return Array.from(_allowlist);
}

/**
 * Add a token to the allowlist (admin operation).
 * Automatically enables the allowlist if it was previously empty.
 *
 * @throws {Error} if the token string is malformed.
 */
export function addAllowedToken(token: string): void {
  _allowlist.add(normaliseToken(token));
}

/**
 * Remove a token from the allowlist (admin operation).
 * If the last entry is removed the allowlist becomes disabled (open mode).
 */
export function removeAllowedToken(token: string): void {
  _allowlist.delete(normaliseToken(token));
}

/**
 * Check whether a token is accepted for stream creation.
 *
 * - When the allowlist is **disabled** (empty): every well-formed token passes.
 * - When the allowlist is **enabled**: only listed tokens pass.
 *
 * @param token  Raw token string from the API request body.
 * @returns `{ accepted: true }` or `{ accepted: false, reason: string }`.
 */
export function checkTokenAllowed(token: string): { accepted: true } | { accepted: false; reason: string } {
  let normalised: string;
  try {
    normalised = normaliseToken(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { accepted: false, reason: `Invalid token format: ${msg}` };
  }

  if (!isAllowlistEnabled()) {
    // Open mode — any well-formed token is accepted.
    return { accepted: true };
  }

  if (_allowlist.has(normalised)) {
    return { accepted: true };
  }

  return {
    accepted: false,
    reason: `Token "${normalised}" is not in the accepted token allowlist. Contact an admin to add it.`,
  };
}

/**
 * Reset the allowlist to its initial (empty / disabled) state.
 * Intended for use in tests only.
 */
export function _resetAllowlistForTesting(): void {
  _allowlist.clear();
}
