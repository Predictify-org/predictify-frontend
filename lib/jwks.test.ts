/** @jest-environment node */

import crypto from 'crypto';
import {
  generateKid,
  generateKeyPair,
  publicKeyToJwk,
  initializeKeyStore,
  getActiveKey,
  getAllKeys,
  buildJwks,
  rotateKey,
  pruneRetiredKeys,
  _resetKeyStoreForTesting,
} from './jwks';

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshStore() {
  _resetKeyStoreForTesting();
}

// ── generateKid ───────────────────────────────────────────────────────────────

describe('generateKid', () => {
  it('returns a string matching YYYY-MM-DD-<8hex> format', () => {
    const kid = generateKid();
    expect(kid).toMatch(/^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
  });

  it('generates unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateKid()));
    expect(ids.size).toBe(200);
  });
});

// ── generateKeyPair ───────────────────────────────────────────────────────────

describe('generateKeyPair', () => {
  it('returns a key pair with the expected structure', () => {
    const kp = generateKeyPair();
    expect(kp.kid).toBeTruthy();
    expect(kp.status).toBe('active');
    expect(kp.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(kp.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    expect(new Date(kp.createdAt).toISOString()).toBe(kp.createdAt);
  });

  it('accepts a custom kid', () => {
    const kp = generateKeyPair('custom-kid');
    expect(kp.kid).toBe('custom-kid');
  });

  it('generates distinct key pairs on successive calls', () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    expect(kp1.publicKeyPem).not.toBe(kp2.publicKeyPem);
    expect(kp1.privateKeyPem).not.toBe(kp2.privateKeyPem);
  });

  it('never stores private key material in the public key PEM', () => {
    const kp = generateKeyPair();
    expect(kp.publicKeyPem).not.toContain('PRIVATE');
  });
});

// ── publicKeyToJwk ────────────────────────────────────────────────────────────

describe('publicKeyToJwk', () => {
  it('extracts required RFC 7517 fields', () => {
    const kp = generateKeyPair('test-kid');
    const jwk = publicKeyToJwk(kp.publicKeyPem, 'test-kid');

    expect(jwk.kty).toBe('RSA');
    expect(jwk.use).toBe('sig');
    expect(jwk.alg).toBe('RS256');
    expect(jwk.kid).toBe('test-kid');
    expect(typeof jwk.n).toBe('string');
    expect(jwk.n.length).toBeGreaterThan(200); // 2048-bit modulus base64url is ~342 chars
    expect(jwk.e).toBe('AQAB'); // base64url(65537)
  });

  it('does not include any private key components', () => {
    const kp = generateKeyPair();
    const jwk = publicKeyToJwk(kp.publicKeyPem, kp.kid) as Record<string, unknown>;

    for (const privateField of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
      expect(jwk).not.toHaveProperty(privateField);
    }
  });

  it('throws on invalid PEM input', () => {
    expect(() => publicKeyToJwk('not-a-valid-pem', 'bad-kid')).toThrow();
  });

  it('throws on empty string input', () => {
    expect(() => publicKeyToJwk('', 'empty')).toThrow();
  });

  it('throws when key has no RSA modulus/exponent (e.g. EC key)', () => {
    // An EC key exports a JWK without `n` or `e`, triggering the guard.
    const { publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }) as unknown as { publicKey: string; privateKey: string };
    expect(() => publicKeyToJwk(publicKey, 'ec-kid')).toThrow(/RSA modulus\/exponent/);
  });

  it('produces base64url-safe strings (no +, /, = padding)', () => {
    const kp = generateKeyPair();
    const jwk = publicKeyToJwk(kp.publicKeyPem, kp.kid);
    // RFC 7515 base64url must not contain + / or = padding
    expect(jwk.n).not.toMatch(/[+/=]/);
    expect(jwk.e).not.toMatch(/[+/=]/);
  });
});

// ── initializeKeyStore ────────────────────────────────────────────────────────

describe('initializeKeyStore', () => {
  beforeEach(freshStore);

  it('creates exactly one active key when the store is empty', () => {
    initializeKeyStore();
    const active = getActiveKey();
    expect(active).not.toBeNull();
    expect(active!.status).toBe('active');
    expect(getAllKeys()).toHaveLength(1);
  });

  it('is idempotent — does not create a second key on repeated calls', () => {
    initializeKeyStore();
    initializeKeyStore();
    initializeKeyStore();
    expect(getAllKeys()).toHaveLength(1);
  });
});

// ── getActiveKey / getAllKeys ──────────────────────────────────────────────────

describe('getActiveKey', () => {
  beforeEach(freshStore);

  it('returns null when the store is empty', () => {
    expect(getActiveKey()).toBeNull();
  });

  it('returns the active key after initialisation', () => {
    initializeKeyStore();
    const active = getActiveKey();
    expect(active).not.toBeNull();
    expect(active!.status).toBe('active');
  });
});

describe('getAllKeys', () => {
  beforeEach(freshStore);

  it('returns an empty array when the store is empty', () => {
    expect(getAllKeys()).toEqual([]);
  });

  it('returns a snapshot — mutations to the result do not affect the store', () => {
    initializeKeyStore();
    const snapshot = getAllKeys();
    (snapshot[0] as Record<string, unknown>).status = 'retiring';
    expect(getActiveKey()!.status).toBe('active'); // store unchanged
  });
});

// ── buildJwks ─────────────────────────────────────────────────────────────────

describe('buildJwks', () => {
  beforeEach(freshStore);

  it('auto-initialises and returns at least one key', () => {
    const jwks = buildJwks();
    expect(jwks.keys).toBeInstanceOf(Array);
    expect(jwks.keys.length).toBeGreaterThanOrEqual(1);
  });

  it('includes all required RFC 7517 fields for each key', () => {
    const jwks = buildJwks();
    for (const key of jwks.keys) {
      expect(key).toMatchObject({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: expect.any(String),
        n: expect.any(String),
        e: expect.any(String),
      });
    }
  });

  it('never exposes private key material', () => {
    const jwks = buildJwks();
    const payload = JSON.stringify(jwks);
    for (const field of ['PRIVATE KEY', '"d"', '"p"', '"q"', '"dp"', '"dq"', '"qi"']) {
      expect(payload).not.toContain(field);
    }
  });

  it('returns a valid JSON structure (array under "keys" property)', () => {
    const jwks = buildJwks();
    expect(Object.keys(jwks)).toEqual(['keys']);
    expect(Array.isArray(jwks.keys)).toBe(true);
  });
});

// ── rotateKey ─────────────────────────────────────────────────────────────────

describe('rotateKey', () => {
  beforeEach(freshStore);

  it('promotes previous active key to retiring and creates a new active key', () => {
    initializeKeyStore();
    const originalKid = getActiveKey()!.kid;

    const newKey = rotateKey();

    expect(newKey.status).toBe('active');
    expect(newKey.kid).not.toBe(originalKid);

    const all = getAllKeys();
    const retiring = all.find(k => k.kid === originalKid);
    expect(retiring?.status).toBe('retiring');
    expect(all.filter(k => k.status === 'active')).toHaveLength(1);
  });

  it('publishes both active and retiring keys in subsequent buildJwks call', () => {
    initializeKeyStore();
    rotateKey();

    const jwks = buildJwks();
    expect(jwks.keys).toHaveLength(2);
  });

  it('maintains exactly one active key across multiple rotations', () => {
    initializeKeyStore();
    rotateKey();
    rotateKey();
    rotateKey();

    const activeKeys = getAllKeys().filter(k => k.status === 'active');
    expect(activeKeys).toHaveLength(1);
    expect(buildJwks().keys).toHaveLength(4); // 1 active + 3 retiring
  });

  it('returns a key pair with a fresh PEM-encoded RSA key', () => {
    initializeKeyStore();
    const newKey = rotateKey();
    expect(newKey.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(newKey.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
  });
});

// ── pruneRetiredKeys ──────────────────────────────────────────────────────────

describe('pruneRetiredKeys', () => {
  beforeEach(freshStore);

  it('removes retiring keys older than maxAgeMs', () => {
    initializeKeyStore();
    rotateKey(); // original key is now retiring

    const oneHourMs = 60 * 60 * 1000;
    // Advance the clock by 2 hours so the retiring key is past the 1-hour threshold.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * oneHourMs);

    pruneRetiredKeys(oneHourMs);

    jest.restoreAllMocks();

    const remaining = getAllKeys();
    expect(remaining.filter(k => k.status === 'retiring')).toHaveLength(0);
    expect(remaining.filter(k => k.status === 'active')).toHaveLength(1);
  });

  it('keeps retiring keys younger than maxAgeMs', () => {
    initializeKeyStore();
    rotateKey();

    pruneRetiredKeys(24 * 60 * 60 * 1000); // 24 hours — the key was just created

    expect(getAllKeys().filter(k => k.status === 'retiring')).toHaveLength(1);
  });

  it('never prunes active keys regardless of age', () => {
    initializeKeyStore();
    pruneRetiredKeys(0); // zero threshold — removes everything older than now

    expect(getActiveKey()).not.toBeNull();
  });

  it('is a no-op when there are no retiring keys', () => {
    initializeKeyStore();
    const before = getAllKeys().length;
    pruneRetiredKeys();
    expect(getAllKeys()).toHaveLength(before);
  });
});
