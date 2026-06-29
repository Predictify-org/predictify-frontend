/**
 * JWKS (JSON Web Key Set) key management library.
 *
 * Implements RFC 7517 compliant RSA key generation, rotation, and serialization
 * for JWT signing key lifecycle management.
 *
 * Key Rotation Model:
 *   "active"   — the current signing key; used for all new JWT issuance.
 *   "retiring" — a previously active key; still published so tokens signed
 *                before rotation remain verifiable by third-party clients.
 *
 * Both states appear in the JWKS response. Clients that cache the old JWKS
 * can still validate existing tokens after a rotation event because the
 * retiring key remains published until it is explicitly pruned.
 *
 * Storage note: this implementation uses an in-process singleton. Replace
 * _store read/write with KMS or database calls for production multi-replica
 * deployments.
 */

import crypto from 'crypto';
import { logger } from '@/app/lib/logger';

// ── Constants ─────────────────────────────────────────────────────────────────

/** RSA modulus length in bits (NIST SP 800-57 minimum for new keys). */
const RSA_MODULUS_LENGTH = 2048;

/** Public exponent used universally; 65537 encodes as base64url "AQAB". */
const RSA_PUBLIC_EXPONENT = 65537;

// ── Types ─────────────────────────────────────────────────────────────────────

/** RFC 7517 JSON Web Key (public RSA components only). */
export interface JwkPublicKey {
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  kid: string;
  /** Base64url-encoded modulus (n). */
  n: string;
  /** Base64url-encoded public exponent (e). */
  e: string;
}

/** RFC 7517 JSON Web Key Set. */
export interface JwkSet {
  keys: JwkPublicKey[];
}

/** Lifecycle state of a managed key pair. */
export type KeyStatus = 'active' | 'retiring';

/** An RSA key pair managed by this library. */
export interface ManagedKeyPair {
  /** Stable, unique key identifier included in JWT `kid` header. */
  kid: string;
  status: KeyStatus;
  /** ISO-8601 timestamp of key creation. */
  createdAt: string;
  /** PEM-encoded SubjectPublicKeyInfo (SPKI). */
  publicKeyPem: string;
  /** PEM-encoded PKCS#8 private key — NEVER exposed via the endpoint. */
  privateKeyPem: string;
}

// ── In-memory key store ────────────────────────────────────────────────────────

// The store holds at most a few keys (one active + retiring).
// Mutation is synchronous; all public functions are safe to call concurrently
// within a single Node.js event loop (no parallel writes).
let _store: ManagedKeyPair[] = [];

// ── Key ID generation ─────────────────────────────────────────────────────────

/**
 * Generate a stable, time-ordered key ID.
 *
 * Format: `YYYY-MM-DD-<8 hex chars>`
 * Example: `2024-01-15-a3f9c1b2`
 */
export function generateKid(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rand = crypto.randomBytes(4).toString('hex');
  return `${date}-${rand}`;
}

// ── Key generation ────────────────────────────────────────────────────────────

/**
 * Generate a new RSA-2048 key pair and wrap it in a ManagedKeyPair.
 *
 * The private key is stored only in-process (or in the caller's KMS).
 * It is never serialised into the JWKS response.
 *
 * @param kid - Optional key ID; a timestamped random ID is generated if omitted.
 */
export function generateKeyPair(kid?: string): ManagedKeyPair {
  const resolvedKid = kid ?? generateKid();

  // generateKeyPairSync returns PEM strings when encoding options are provided.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_LENGTH,
    publicExponent: RSA_PUBLIC_EXPONENT,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }) as unknown as { publicKey: string; privateKey: string };

  return {
    kid: resolvedKid,
    status: 'active',
    createdAt: new Date().toISOString(),
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

// ── JWK serialisation ─────────────────────────────────────────────────────────

/**
 * Convert a PEM-encoded RSA public key into a RFC 7517 JWK object.
 *
 * Only the public key components (kty, use, alg, kid, n, e) are returned.
 * Private key material (d, p, q, dp, dq, qi) is never included.
 *
 * @throws {Error} if the PEM cannot be parsed or is not an RSA key.
 */
export function publicKeyToJwk(publicKeyPem: string, kid: string): JwkPublicKey {
  // createPublicKey throws on invalid PEM.
  const keyObject = crypto.createPublicKey(publicKeyPem);
  const jwk = keyObject.export({ format: 'jwk' }) as crypto.JsonWebKey;

  if (!jwk.n || !jwk.e) {
    throw new Error(`[jwks] Failed to extract RSA modulus/exponent for kid=${kid}`);
  }

  return {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid,
    n: jwk.n,
    e: jwk.e,
  };
}

// ── Store accessors ───────────────────────────────────────────────────────────

/**
 * Return the current active signing key, or null if the store is empty.
 */
export function getActiveKey(): ManagedKeyPair | null {
  return _store.find(k => k.status === 'active') ?? null;
}

/**
 * Return all keys (active and retiring) held in the store.
 * Returns shallow copies so callers cannot mutate stored key objects.
 */
export function getAllKeys(): ManagedKeyPair[] {
  return _store.map(k => ({ ...k }));
}

// ── Lifecycle operations ──────────────────────────────────────────────────────

/**
 * Bootstrap the key store with a fresh active key.
 *
 * Idempotent: does nothing if the store already contains at least one key.
 * Call this once at application startup.
 */
export function initializeKeyStore(): void {
  if (_store.length > 0) return;

  const keyPair = generateKeyPair();
  _store = [keyPair];

  logger.info('[jwks] Key store initialised', { kid: keyPair.kid });
}

/**
 * Rotate the active signing key.
 *
 * Step 1 — Mark the current active key as `retiring`. It remains published
 *           in the JWKS so any existing JWTs signed with it remain verifiable.
 * Step 2 — Generate a new `active` key pair and append it to the store.
 *
 * Callers should update their JWT signing path to use the returned key.
 *
 * @returns The newly created active key pair.
 */
export function rotateKey(): ManagedKeyPair {
  // Demote all currently active keys to retiring.
  _store = _store.map(k =>
    k.status === 'active' ? { ...k, status: 'retiring' as KeyStatus } : k
  );

  const newKey = generateKeyPair();
  _store = [..._store, newKey];

  logger.info('[jwks] Key rotated', {
    new_kid: newKey.kid,
    retiring_count: _store.filter(k => k.status === 'retiring').length,
  });

  return newKey;
}

/**
 * Prune retiring keys whose age exceeds `maxAgeMs` (default: 24 hours).
 *
 * Call this on a schedule (e.g., hourly) to bound JWKS response size.
 * Active keys are never pruned.
 *
 * @param maxAgeMs - Maximum age in milliseconds before a retiring key is removed.
 */
export function pruneRetiredKeys(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const cutoffMs = Date.now() - maxAgeMs;
  const before = _store.length;

  _store = _store.filter(k => {
    if (k.status !== 'retiring') return true;
    return new Date(k.createdAt).getTime() > cutoffMs;
  });

  const pruned = before - _store.length;
  if (pruned > 0) {
    logger.info('[jwks] Pruned retired keys', { count: pruned });
  }
}

// ── JWKS response builder ─────────────────────────────────────────────────────

/**
 * Build a RFC 7517 JWKS payload from all keys in the store.
 *
 * Auto-initialises the store on first call so that the endpoint is always
 * able to return at least one public key without requiring an explicit
 * bootstrap step from the caller.
 *
 * The response contains ONLY public key material (kty, use, alg, kid, n, e).
 *
 * @throws {Error} if key serialisation fails for any stored key.
 */
export function buildJwks(): JwkSet {
  if (_store.length === 0) {
    initializeKeyStore();
  }

  const keys = _store.map(k => publicKeyToJwk(k.publicKeyPem, k.kid));
  return { keys };
}

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Reset the in-memory key store to empty. For use in tests only.
 *
 * @internal
 */
export function _resetKeyStoreForTesting(): void {
  _store = [];
}
