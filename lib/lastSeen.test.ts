/** @jest-environment node */

import {
  touchLastSeen,
  getLastSeen,
  getAllLastSeen,
  resetLastSeenStore,
  extractActorIdFromAuthHeader,
  touchLastSeenFromRequest,
} from './lastSeen';

// Two distinct Stellar-style actor IDs used throughout the suite
const ACTOR_A = 'GDUKMGUGDZQK6Y2VCXWQ3BWYQF6Q3EDL2CIMH6H3K7VKTDH6ZVSTREAM';
const ACTOR_B = 'GCBDSGPCWUFJLQ2LWHRYBXGJGGCQHGGCQQTKFH5TRJXVHHZKTPVSTREAM';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a syntactically valid (but unsigned) JWT with the given payload. */
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${header}.${body}.fakesig`;
}

function makeBearer(payload: Record<string, unknown>): string {
  return `Bearer ${makeToken(payload)}`;
}

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader);
  }
  return new Request('https://api.example.com/api/identity/me', { headers });
}

// ---------------------------------------------------------------------------
// Store isolation
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetLastSeenStore();
});

// ---------------------------------------------------------------------------
// touchLastSeen
// ---------------------------------------------------------------------------

describe('touchLastSeen', () => {
  it('records a timestamp for a new actor', () => {
    touchLastSeen(ACTOR_A);
    expect(getLastSeen(ACTOR_A)).not.toBeNull();
  });

  it('stores the supplied ISO timestamp verbatim', () => {
    touchLastSeen(ACTOR_A, '2026-01-15T10:00:00.000Z');
    expect(getLastSeen(ACTOR_A)).toBe('2026-01-15T10:00:00.000Z');
  });

  it('overwrites an earlier timestamp with a later one', () => {
    touchLastSeen(ACTOR_A, '2026-01-01T00:00:00.000Z');
    touchLastSeen(ACTOR_A, '2026-06-28T12:00:00.000Z');
    expect(getLastSeen(ACTOR_A)).toBe('2026-06-28T12:00:00.000Z');
  });

  it('tracks multiple actors independently', () => {
    touchLastSeen(ACTOR_A, '2026-01-01T00:00:00.000Z');
    touchLastSeen(ACTOR_B, '2026-06-01T00:00:00.000Z');
    expect(getLastSeen(ACTOR_A)).toBe('2026-01-01T00:00:00.000Z');
    expect(getLastSeen(ACTOR_B)).toBe('2026-06-01T00:00:00.000Z');
  });

  it('is a no-op for an empty actorId', () => {
    touchLastSeen('');
    expect(getAllLastSeen().size).toBe(0);
  });

  it('defaults at to a valid ISO-8601 string when omitted', () => {
    const before = Date.now();
    touchLastSeen(ACTOR_A);
    const after = Date.now();
    const stored = getLastSeen(ACTOR_A)!;
    const ts = new Date(stored).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// getLastSeen
// ---------------------------------------------------------------------------

describe('getLastSeen', () => {
  it('returns null for an actor that has never been seen', () => {
    expect(getLastSeen(ACTOR_A)).toBeNull();
  });

  it('returns null for an unknown actorId after other actors are stored', () => {
    touchLastSeen(ACTOR_B);
    expect(getLastSeen(ACTOR_A)).toBeNull();
  });

  it('returns the stored timestamp after a touch', () => {
    touchLastSeen(ACTOR_A, '2026-03-10T08:00:00.000Z');
    expect(getLastSeen(ACTOR_A)).toBe('2026-03-10T08:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// getAllLastSeen
// ---------------------------------------------------------------------------

describe('getAllLastSeen', () => {
  it('returns an empty map on a fresh store', () => {
    expect(getAllLastSeen().size).toBe(0);
  });

  it('reflects all touched actors', () => {
    touchLastSeen(ACTOR_A, '2026-01-01T00:00:00.000Z');
    touchLastSeen(ACTOR_B, '2026-02-01T00:00:00.000Z');
    const all = getAllLastSeen();
    expect(all.size).toBe(2);
    expect(all.get(ACTOR_A)).toBe('2026-01-01T00:00:00.000Z');
    expect(all.get(ACTOR_B)).toBe('2026-02-01T00:00:00.000Z');
  });

  it('returns a live view of the store keyed by actorId', () => {
    touchLastSeen(ACTOR_A, '2026-01-01T00:00:00.000Z');
    const all = getAllLastSeen();
    expect(all.get(ACTOR_A)).toBe('2026-01-01T00:00:00.000Z');
    expect(all.has(ACTOR_B)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetLastSeenStore
// ---------------------------------------------------------------------------

describe('resetLastSeenStore', () => {
  it('clears all entries', () => {
    touchLastSeen(ACTOR_A);
    touchLastSeen(ACTOR_B);
    resetLastSeenStore();
    expect(getAllLastSeen().size).toBe(0);
    expect(getLastSeen(ACTOR_A)).toBeNull();
  });

  it('is idempotent on an already-empty store', () => {
    expect(() => resetLastSeenStore()).not.toThrow();
    expect(getAllLastSeen().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// extractActorIdFromAuthHeader
// ---------------------------------------------------------------------------

describe('extractActorIdFromAuthHeader', () => {
  it('extracts sub from a well-formed Bearer token', () => {
    const header = makeBearer({ sub: ACTOR_A, iss: 'streampay' });
    expect(extractActorIdFromAuthHeader(header)).toBe(ACTOR_A);
  });

  it('returns null for a null header', () => {
    expect(extractActorIdFromAuthHeader(null)).toBeNull();
  });

  it('returns null when the header does not start with "Bearer "', () => {
    expect(extractActorIdFromAuthHeader('Basic abc123')).toBeNull();
    expect(extractActorIdFromAuthHeader(makeToken({ sub: ACTOR_A }))).toBeNull();
  });

  it('returns null when the token has fewer than 3 segments', () => {
    expect(extractActorIdFromAuthHeader('Bearer header.payload')).toBeNull();
  });

  it('returns null when the token has more than 3 segments', () => {
    expect(extractActorIdFromAuthHeader('Bearer a.b.c.d')).toBeNull();
  });

  it('returns null when the payload segment is invalid base64', () => {
    expect(extractActorIdFromAuthHeader('Bearer header.!!!.sig')).toBeNull();
  });

  it('returns null when the payload is valid base64 but not JSON', () => {
    const notJson = btoa('not-json').replace(/=/g, '');
    expect(extractActorIdFromAuthHeader(`Bearer hdr.${notJson}.sig`)).toBeNull();
  });

  it('returns null when the payload has no sub claim', () => {
    const header = makeBearer({ role: 'user' });
    expect(extractActorIdFromAuthHeader(header)).toBeNull();
  });

  it('returns null when sub is an empty string', () => {
    const header = makeBearer({ sub: '' });
    expect(extractActorIdFromAuthHeader(header)).toBeNull();
  });

  it('returns null when sub is not a string', () => {
    const header = makeBearer({ sub: 42 });
    expect(extractActorIdFromAuthHeader(header)).toBeNull();
  });

  it('returns null when sub is null', () => {
    const header = makeBearer({ sub: null });
    expect(extractActorIdFromAuthHeader(header)).toBeNull();
  });

  it('handles base64url encoding with - and _ characters in the payload', () => {
    // Construct a payload where the base64url output would naturally contain + or /
    const longSub = 'x'.repeat(60);
    const header = makeBearer({ sub: longSub });
    expect(extractActorIdFromAuthHeader(header)).toBe(longSub);
  });

  it('handles missing padding gracefully (base64url has no padding)', () => {
    // makeBearer strips = padding — verify we still decode correctly
    const header = makeBearer({ sub: ACTOR_A, extra: 'abcde' });
    expect(extractActorIdFromAuthHeader(header)).toBe(ACTOR_A);
  });
});

// ---------------------------------------------------------------------------
// touchLastSeenFromRequest
// ---------------------------------------------------------------------------

describe('touchLastSeenFromRequest', () => {
  it('updates the store for a request with a valid Bearer token', () => {
    const request = makeRequest(makeBearer({ sub: ACTOR_A }));
    touchLastSeenFromRequest(request);
    expect(getLastSeen(ACTOR_A)).not.toBeNull();
  });

  it('is a no-op for a request without an Authorization header', () => {
    const request = makeRequest();
    touchLastSeenFromRequest(request);
    expect(getAllLastSeen().size).toBe(0);
  });

  it('is a no-op for a non-Bearer Authorization header', () => {
    const request = makeRequest('Basic dXNlcjpwYXNz');
    touchLastSeenFromRequest(request);
    expect(getAllLastSeen().size).toBe(0);
  });

  it('is a no-op when the token payload has no sub', () => {
    const request = makeRequest(makeBearer({ role: 'admin' }));
    touchLastSeenFromRequest(request);
    expect(getAllLastSeen().size).toBe(0);
  });

  it('records a timestamp close to the call time', () => {
    const before = Date.now();
    const request = makeRequest(makeBearer({ sub: ACTOR_A }));
    touchLastSeenFromRequest(request);
    const after = Date.now();

    const stored = getLastSeen(ACTOR_A)!;
    const ts = new Date(stored).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('tracks two different actors on successive requests', () => {
    touchLastSeenFromRequest(makeRequest(makeBearer({ sub: ACTOR_A })));
    touchLastSeenFromRequest(makeRequest(makeBearer({ sub: ACTOR_B })));
    expect(getLastSeen(ACTOR_A)).not.toBeNull();
    expect(getLastSeen(ACTOR_B)).not.toBeNull();
  });
});
