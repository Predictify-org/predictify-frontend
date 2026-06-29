/** @jest-environment node */

/**
 * Tests for X-Request-Id propagation utilities (lib/requestId.ts).
 *
 * Covers:
 *  - ID generation format
 *  - Validation edge cases
 *  - resolveRequestId: accept valid / reject invalid / generate when absent
 *  - applyRequestIdPolicy: stamps both request and response headers
 */

import {
  REQUEST_ID_HEADER,
  generateRequestId,
  isValidRequestId,
  resolveRequestId,
  applyRequestIdPolicy,
} from './requestId';

// ---------------------------------------------------------------------------
// generateRequestId
// ---------------------------------------------------------------------------

describe('generateRequestId', () => {
  it('returns a string with the req_ prefix', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_/);
  });

  it('returns a UUID-v4 after the prefix', () => {
    const id = generateRequestId();
    // req_<uuid-v4>
    expect(id).toMatch(
      /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns a unique value on each call', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateRequestId()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// isValidRequestId
// ---------------------------------------------------------------------------

describe('isValidRequestId', () => {
  it('accepts a standard req_ prefixed UUID', () => {
    expect(isValidRequestId('req_550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts arbitrary printable ASCII up to the length limit', () => {
    expect(isValidRequestId('abc-123_XYZ')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidRequestId('')).toBe(false);
  });

  it('rejects a value that exceeds 128 characters', () => {
    const tooLong = 'a'.repeat(129);
    expect(isValidRequestId(tooLong)).toBe(false);
  });

  it('accepts a value of exactly 128 characters', () => {
    const atLimit = 'a'.repeat(128);
    expect(isValidRequestId(atLimit)).toBe(true);
  });

  it('rejects a value containing whitespace', () => {
    expect(isValidRequestId('req id with spaces')).toBe(false);
  });

  it('rejects a value containing control characters', () => {
    // ASCII 0x01 is a control character outside the printable range.
    expect(isValidRequestId('req_\x01bad')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveRequestId
// ---------------------------------------------------------------------------

describe('resolveRequestId', () => {
  it('reuses a valid incoming X-Request-Id header verbatim', () => {
    const incomingId = 'req_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const headers = new Headers({ [REQUEST_ID_HEADER]: incomingId });
    expect(resolveRequestId(headers)).toBe(incomingId);
  });

  it('generates a fresh ID when the header is absent', () => {
    const headers = new Headers();
    const id = resolveRequestId(headers);
    expect(id).toMatch(/^req_/);
  });

  it('generates a fresh ID when the header value is invalid (whitespace)', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'bad id' });
    const id = resolveRequestId(headers);
    expect(id).toMatch(/^req_/);
    expect(id).not.toBe('bad id');
  });

  it('generates a fresh ID when the header value exceeds 128 chars', () => {
    const tooLong = 'a'.repeat(200);
    const headers = new Headers({ [REQUEST_ID_HEADER]: tooLong });
    const id = resolveRequestId(headers);
    expect(id).toMatch(/^req_/);
    expect(id).not.toBe(tooLong);
  });
});

// ---------------------------------------------------------------------------
// applyRequestIdPolicy
// ---------------------------------------------------------------------------

describe('applyRequestIdPolicy', () => {
  it('stamps the resolved ID on both request and response headers', () => {
    const incomingId = 'req_policy_test_id';
    const incoming = new Headers({ [REQUEST_ID_HEADER]: incomingId });
    const forwarded = new Headers();
    const response = new Headers();

    const returned = applyRequestIdPolicy(incoming, forwarded, response);

    expect(returned).toBe(incomingId);
    expect(forwarded.get(REQUEST_ID_HEADER)).toBe(incomingId);
    expect(response.get(REQUEST_ID_HEADER)).toBe(incomingId);
  });

  it('generates and stamps a fresh ID when no incoming header is present', () => {
    const incoming = new Headers();
    const forwarded = new Headers();
    const response = new Headers();

    const returned = applyRequestIdPolicy(incoming, forwarded, response);

    expect(returned).toMatch(/^req_/);
    expect(forwarded.get(REQUEST_ID_HEADER)).toBe(returned);
    expect(response.get(REQUEST_ID_HEADER)).toBe(returned);
  });

  it('overwrites an existing ID on the forwarded headers with the resolved one', () => {
    const incomingId = 'req_override_me';
    const incoming = new Headers({ [REQUEST_ID_HEADER]: incomingId });
    const forwarded = new Headers({ [REQUEST_ID_HEADER]: 'stale-id' });
    const response = new Headers();

    applyRequestIdPolicy(incoming, forwarded, response);

    expect(forwarded.get(REQUEST_ID_HEADER)).toBe(incomingId);
  });

  it('rejects an invalid incoming ID and generates a fresh one', () => {
    const incoming = new Headers({ [REQUEST_ID_HEADER]: 'bad id with spaces' });
    const forwarded = new Headers();
    const response = new Headers();

    const returned = applyRequestIdPolicy(incoming, forwarded, response);

    expect(returned).toMatch(/^req_/);
    expect(returned).not.toBe('bad id with spaces');
    expect(forwarded.get(REQUEST_ID_HEADER)).toBe(returned);
    expect(response.get(REQUEST_ID_HEADER)).toBe(returned);
  });
});

// ---------------------------------------------------------------------------
// Middleware integration: X-Request-Id is visible on responses
// ---------------------------------------------------------------------------

describe('middleware request-id propagation (integration)', () => {
  let middleware: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();

    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const mod = await import('../middleware');
    middleware = mod.middleware as any;
  });

  afterEach(() => {
    delete (process.env as any).STELLAR_NETWORK;
    delete (process.env as any).JWT_SECRET;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).ALLOWED_ORIGINS;
  });

  it('echoes a valid incoming X-Request-Id back on the response', async () => {
    const requestId = 'req_echo_test_id';
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { [REQUEST_ID_HEADER]: requestId },
    });

    const response = await middleware(request as any);

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe(requestId);
  });

  it('generates a request ID when none is provided', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
    });

    const response = await middleware(request as any);

    const id = response.headers.get(REQUEST_ID_HEADER);
    expect(id).toMatch(/^req_/);
  });

  it('generates a fresh ID when the incoming ID is invalid', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { [REQUEST_ID_HEADER]: 'not valid!' },
    });

    const response = await middleware(request as any);

    const id = response.headers.get(REQUEST_ID_HEADER);
    expect(id).toMatch(/^req_/);
    expect(id).not.toBe('not valid!');
  });
});
