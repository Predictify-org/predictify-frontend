/**
 * SEP-41 Token Allowlist with TTL Cache and Single-Flight Semantics
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
 * - **Caching**: Both allowlist state and token check results are cached with
 *   a 30-second TTL. Single-flight semantics (via promise-based locking) ensure
 *   that when the cache expires, only ONE request refreshes it. This prevents
 *   cache stampedes where many concurrent requests would otherwise all trigger
 *   expensive operations (e.g., DB queries, external API calls) simultaneously.
 *
 * Token format:
 *   - "XLM" or "native" → Stellar native lumens
 *   - "CODE:ISSUER"      → SEP-41 / Stellar Classic asset
 *
 * ## Cache Behavior
 * - TTL: 30 seconds for both allowlist state and token check results
 * - Mutations (add/remove token) invalidate all caches immediately
 * - Single-flight lock ensures stampede protection without blocking
 * - Thread-safe for concurrent calls via Promise coordination
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

// ── TTL Cache with Single-Flight Semantics ───────────────────────────────────

/**
 * Cache entry for a token check result.
 * Stores the result and expiration timestamp.
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Returns true if a cache entry has expired.
 */
function isCacheExpired<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return true;
  return Date.now() >= entry.expiresAt;
}

/**
 * Creates a cache entry with the given TTL (in milliseconds).
 */
function createCacheEntry<T>(data: T, ttlMs: number): CacheEntry<T> {
  return {
    data,
    expiresAt: Date.now() + ttlMs,
  };
}

// 30-second TTL for cache entries
const CACHE_TTL_MS = 30_000;

/**
 * In-flight promises for single-flight semantics.
 * Maps token → Promise that resolves to the check result.
 * Prevents concurrent calls to the same expensive operation.
 */
const _inFlightChecks = new Map<string, Promise<{ accepted: true } | { accepted: false; reason: string }>>();

/**
 * Cache for token check results.
 * Maps normalised token → cached check result with expiration.
 */
const _checkResultCache = new Map<string, CacheEntry<{ accepted: true } | { accepted: false; reason: string }>>();

/**
 * Cache for allowlist state (isEnabled flag).
 * Single entry to track whether allowlist is currently enabled.
 */
let _allowlistStateCache: CacheEntry<boolean> | null = null;

// ── In-memory allowlist state ─────────────────────────────────────────────────

/**
 * The live allowlist set.  Each entry is a normalised token string.
 * An empty set means the allowlist is disabled (all valid tokens accepted).
 */
const _allowlist: Set<string> = new Set();

/**
 * Invalidate all caches.
 * Called whenever the allowlist is mutated.
 */
function _invalidateAllCaches(): void {
  _checkResultCache.clear();
  _allowlistStateCache = null;
  _inFlightChecks.clear();
}

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
 *
 * Uses cached state with 30s TTL.
 */
export function isAllowlistEnabled(): boolean {
  // Check cache first
  if (!isCacheExpired(_allowlistStateCache)) {
    return _allowlistStateCache!.data;
  }

  // Cache miss or expired: recompute and cache
  const enabled = _allowlist.size > 0;
  _allowlistStateCache = createCacheEntry(enabled, CACHE_TTL_MS);
  return enabled;
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
 * Invalidates all caches.
 *
 * @throws {Error} if the token string is malformed.
 */
export function addAllowedToken(token: string): void {
  _allowlist.add(normaliseToken(token));
  _invalidateAllCaches();
}

/**
 * Remove a token from the allowlist (admin operation).
 * If the last entry is removed the allowlist becomes disabled (open mode).
 * Invalidates all caches.
 */
export function removeAllowedToken(token: string): void {
  _allowlist.delete(normaliseToken(token));
  _invalidateAllCaches();
}

/**
 * Check whether a token is accepted for stream creation.
 *
 * - When the allowlist is **disabled** (empty): every well-formed token passes.
 * - When the allowlist is **enabled**: only listed tokens pass.
 *
 * Implements single-flight semantics: when the cache expires and multiple
 * concurrent calls arrive, only one will re-evaluate; others will wait for
 * its result. This prevents cache stampedes.
 *
 * @param token  Raw token string from the API request body.
 * @returns `{ accepted: true }` or `{ accepted: false, reason: string }`.
 */
export async function checkTokenAllowed(
  token: string,
): Promise<{ accepted: true } | { accepted: false; reason: string }> {
  let normalised: string;
  try {
    normalised = normaliseToken(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Malformed tokens are not cached — fail fast without cache
    return { accepted: false, reason: `Invalid token format: ${msg}` };
  }

  // Check token result cache
  const cachedResult = _checkResultCache.get(normalised);
  if (!isCacheExpired(cachedResult)) {
    return cachedResult!.data;
  }

  // Check if another request is already performing the check (single-flight)
  const inFlight = _inFlightChecks.get(normalised);
  if (inFlight) {
    // Wait for the in-flight operation to complete
    return inFlight;
  }

  // Create a new check operation and store it as in-flight
  const checkPromise = (async () => {
    try {
      // Perform the actual check
      const result = _performCheckTokenAllowed(normalised);

      // Cache the result
      _checkResultCache.set(normalised, createCacheEntry(result, CACHE_TTL_MS));

      return result;
    } finally {
      // Always remove from in-flight map when done
      _inFlightChecks.delete(normalised);
    }
  })();

  _inFlightChecks.set(normalised, checkPromise);
  return checkPromise;
}

/**
 * Synchronous implementation of token check (no async operations).
 * This is called internally and can be wrapped by the async cache layer.
 *
 * @private
 */
function _performCheckTokenAllowed(normalised: string): { accepted: true } | { accepted: false; reason: string } {
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
 * Clears all caches as well.
 * Intended for use in tests only.
 */
export function _resetAllowlistForTesting(): void {
  _allowlist.clear();
  _invalidateAllCaches();
}

/**
 * Wait for all in-flight operations to complete.
 * Intended for use in tests only (to ensure cache operations finish).
 */
export async function _waitForInFlightOperations(): Promise<void> {
  const promises = Array.from(_inFlightChecks.values());
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
