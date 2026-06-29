/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from './route';
import {
  _resetKeyStoreForTesting,
  initializeKeyStore,
  rotateKey,
} from '@/lib/jwks';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/.well-known/jwks.json', {
    method: 'GET',
    headers,
  });
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  _resetKeyStoreForTesting();
});

// ── HTTP response tests ───────────────────────────────────────────────────────

describe('GET /.well-known/jwks.json', () => {
  it('returns HTTP 200', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('returns a valid JWKS payload with at least one key', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body).toHaveProperty('keys');
    expect(Array.isArray(body.keys)).toBe(true);
    expect(body.keys.length).toBeGreaterThanOrEqual(1);
  });

  it('sets the correct Cache-Control header', async () => {
    const res = await GET(makeRequest());
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).toContain('public');
    expect(cc).toContain('max-age=3600');
    expect(cc).toContain('stale-while-revalidate=300');
  });

  it('sets X-Request-Id response header', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('echoes an incoming x-request-id correlation header', async () => {
    const res = await GET(makeRequest({ 'x-request-id': 'integration-test-id-42' }));
    expect(res.headers.get('X-Request-Id')).toBe('integration-test-id-42');
  });

  it('sets X-Correlation-Id response header', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('X-Correlation-Id')).toBeTruthy();
  });

  it('auto-initialises the key store when it is empty', async () => {
    // Store was reset in beforeEach; the endpoint should bootstrap it.
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys.length).toBeGreaterThanOrEqual(1);
  });
});

// ── RFC 7517 key structure tests ──────────────────────────────────────────────

describe('JWKS key structure (RFC 7517)', () => {
  it('each key has kty, use, alg, kid, n, and e', async () => {
    const res = await GET(makeRequest());
    const { keys } = await res.json();

    for (const key of keys) {
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

  it('exponent "e" is base64url(65537) — "AQAB"', async () => {
    const res = await GET(makeRequest());
    const { keys } = await res.json();
    for (const key of keys) {
      expect(key.e).toBe('AQAB');
    }
  });

  it('modulus "n" is a sufficiently long base64url string (≥340 chars for 2048-bit key)', async () => {
    const res = await GET(makeRequest());
    const { keys } = await res.json();
    for (const key of keys) {
      expect(key.n.length).toBeGreaterThanOrEqual(340);
    }
  });

  it('n and e do not contain base64 padding or + / characters', async () => {
    const res = await GET(makeRequest());
    const { keys } = await res.json();
    for (const key of keys) {
      expect(key.n).not.toMatch(/[+/=]/);
      expect(key.e).not.toMatch(/[+/=]/);
    }
  });
});

// ── Security tests — no private key material ──────────────────────────────────

describe('Security: private key material must never be exposed', () => {
  it('response body does not contain private key fields (d, p, q, dp, dq, qi)', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    for (const key of body.keys) {
      for (const privateField of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
        expect(key).not.toHaveProperty(privateField);
      }
    }
  });

  it('raw response JSON does not contain PEM private key markers', async () => {
    const res = await GET(makeRequest());
    const text = await res.clone().text();
    expect(text).not.toContain('BEGIN PRIVATE KEY');
    expect(text).not.toContain('BEGIN RSA PRIVATE KEY');
  });

  it('JWKS payload contains only the "keys" top-level property', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['keys']);
  });
});

// ── Key rotation integration tests ────────────────────────────────────────────

describe('Key rotation: both active and retiring keys are published', () => {
  it('publishes two keys after one rotation', async () => {
    initializeKeyStore();
    rotateKey();

    const res = await GET(makeRequest());
    const { keys } = await res.json();
    expect(keys).toHaveLength(2);
  });

  it('publishes three keys after two rotations', async () => {
    initializeKeyStore();
    rotateKey();
    rotateKey();

    const res = await GET(makeRequest());
    const { keys } = await res.json();
    expect(keys).toHaveLength(3);
  });

  it('all kids in the JWKS response are unique', async () => {
    initializeKeyStore();
    rotateKey();
    rotateKey();

    const res = await GET(makeRequest());
    const { keys } = await res.json();
    const kids = keys.map((k: { kid: string }) => k.kid);
    expect(new Set(kids).size).toBe(kids.length);
  });
});

// ── Error handling tests ──────────────────────────────────────────────────────

describe('Error handling', () => {
  it('returns a standardised error envelope on internal failure', async () => {
    // Simulate buildJwks throwing by injecting a corrupted key via the store.
    // We import and reset, then mock buildJwks.
    const jwksModule = await import('@/lib/jwks');
    const original = jwksModule.buildJwks;

    jest.spyOn(jwksModule, 'buildJwks').mockImplementationOnce(() => {
      throw new Error('Simulated crypto failure');
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code', 'JWKS_BUILD_FAILED');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('request_id');

    jest.restoreAllMocks();
    void original; // suppress unused variable lint
  });

  it('handles non-Error throws (string / object) without crashing', async () => {
    const jwksModule = await import('@/lib/jwks');

    jest.spyOn(jwksModule, 'buildJwks').mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'string error value';
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.code).toBe('JWKS_BUILD_FAILED');

    jest.restoreAllMocks();
  });
});
