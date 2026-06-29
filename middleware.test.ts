/** @jest-environment node */

describe('CORS middleware', () => {
  let middleware: any;

  beforeEach(async () => {
    jest.resetModules();

    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const imported = await import('./middleware');
    middleware = imported.middleware;
  });

  afterEach(() => {
    delete (process.env as any).STELLAR_NETWORK;
    delete (process.env as any).JWT_SECRET;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).ALLOWED_ORIGINS;
  });

  it('adds CORS headers for allowed origins on normal requests', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { origin: 'https://allowed.example.com' },
    });

    const response = await middleware(request as any);

    expect(response.headers.get('access-control-allow-origin')).toBe('https://allowed.example.com');
    expect(response.headers.get('vary')).toBe('Origin');
  });

  it('does not reflect a disallowed origin', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { origin: 'https://evil.example.com' },
    });

    const response = await middleware(request as any);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('vary')).toBeNull();
  });

  it('returns a preflight response with explicit headers for allowed origins', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://allowed.example.com',
        'access-control-request-method': 'POST',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://allowed.example.com');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    expect(response.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(response.headers.get('access-control-max-age')).toBe('600');
  });

  it('returns a minimal preflight response for disallowed origins', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'POST',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

// =============================================================================
// Request body size cap
// =============================================================================

describe('request size cap middleware', () => {
  /** The default cap enforced by the middleware (256 KB). */
  const DEFAULT_CAP = 256 * 1024; // 262 144 bytes

  let middleware: any;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a synthetic NextRequest-compatible object aimed at a v2 streams path.
   * We construct the URL with `localhost` as the host because NextURL (used by
   * the Edge runtime) requires an absolute URL.
   */
  function makeRequest(
    path: string,
    method: string,
    contentLength: number | null,
    extra: Record<string, string> = {},
  ): Request {
    const headers: Record<string, string> = { ...extra };
    if (contentLength !== null) {
      headers['content-length'] = String(contentLength);
    }
    return new Request(`http://localhost${path}`, { method, headers });
  }

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  beforeEach(async () => {
    jest.resetModules();
    delete (process.env as any).MAX_STREAM_BODY_BYTES;

    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const imported = await import('./middleware');
    middleware = imported.middleware;
  });

  afterEach(() => {
    delete (process.env as any).STELLAR_NETWORK;
    delete (process.env as any).JWT_SECRET;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).ALLOWED_ORIGINS;
    delete (process.env as any).MAX_STREAM_BODY_BYTES;
  });

  // ---------------------------------------------------------------------------
  // Core enforcement
  // ---------------------------------------------------------------------------

  it('returns 413 when Content-Length exceeds the default 256 KB cap on POST /api/v2/streams', async () => {
    const request = makeRequest('/api/v2/streams', 'POST', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('returns 413 when Content-Length exceeds the cap on PUT /api/v2/streams/{id}', async () => {
    const request = makeRequest('/api/v2/streams/stream-abc-123', 'PUT', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('returns 413 when Content-Length exceeds the cap on PATCH /api/v2/streams/{id}/pause', async () => {
    const request = makeRequest('/api/v2/streams/stream-abc-123/pause', 'PATCH', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('passes through when Content-Length is exactly at the 256 KB cap', async () => {
    const request = makeRequest('/api/v2/streams', 'POST', DEFAULT_CAP);
    const response = await middleware(request as any);

    // Should NOT be a 413 — at-limit is allowed.
    expect(response.status).not.toBe(413);
  });

  it('passes through when Content-Length is below the cap', async () => {
    const request = makeRequest('/api/v2/streams', 'POST', 1024); // 1 KB
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  // ---------------------------------------------------------------------------
  // Missing / malformed Content-Length
  // ---------------------------------------------------------------------------

  it('passes through when Content-Length header is absent (let downstream enforce streaming limits)', async () => {
    const request = makeRequest('/api/v2/streams', 'POST', null);
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  // ---------------------------------------------------------------------------
  // Path scoping
  // ---------------------------------------------------------------------------

  it('applies the default size cap to paths outside /api/v2/streams', async () => {
    // /api/v1/streams is subject to the default 256 KB cap.
    const request = makeRequest('/api/v1/streams', 'POST', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('applies the default size cap to other v2 routes (e.g. /api/v2/other)', async () => {
    const request = makeRequest('/api/v2/other', 'POST', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  // ---------------------------------------------------------------------------
  // Method scoping
  // ---------------------------------------------------------------------------

  it('does not apply the size cap to GET requests on /api/v2/streams', async () => {
    // GET requests must never be blocked by the body size cap.
    const request = makeRequest('/api/v2/streams', 'GET', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  it('does not apply the size cap to DELETE requests on /api/v2/streams/{id}', async () => {
    const request = makeRequest('/api/v2/streams/stream-abc-123', 'DELETE', DEFAULT_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  // ---------------------------------------------------------------------------
  // Error envelope shape
  // ---------------------------------------------------------------------------

  it('returns the canonical error envelope with code REQUEST_TOO_LARGE on 413', async () => {
    const overLimit = DEFAULT_CAP + 512;
    const request = makeRequest('/api/v2/streams', 'POST', overLimit);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);

    const body = await response.json();

    expect(body).toMatchObject({
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: expect.stringContaining(String(overLimit)),
        request_id: expect.any(String),
      },
    });
  });

  it('forwards x-request-id from the incoming request into the 413 error envelope', async () => {
    const requestId = 'req_test_forwarded_id';
    const request = makeRequest('/api/v2/streams', 'POST', DEFAULT_CAP + 1, {
      'x-request-id': requestId,
    });
    const response = await middleware(request as any);

    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.error.request_id).toBe(requestId);
  });

  // ---------------------------------------------------------------------------
  // Configurable cap
  // ---------------------------------------------------------------------------

  it('honours MAX_STREAM_BODY_BYTES env override', async () => {
    // Re-import with a custom cap of 1024 bytes so the test is self-contained
    // and does not depend on build-time module caching.
    jest.resetModules();
    (process.env as any).MAX_STREAM_BODY_BYTES = '1024';
    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const { middleware: mw } = await import('./middleware');

    // 1025 bytes — just above the custom 1 KB cap.
    const over = makeRequest('/api/v2/streams', 'POST', 1025);
    const overResponse = await mw(over as any);
    expect(overResponse.status).toBe(413);

    // 1024 bytes — exactly at the custom cap.
    const at = makeRequest('/api/v2/streams', 'POST', 1024);
    const atResponse = await mw(at as any);
    expect(atResponse.status).not.toBe(413);
  });

  // ---------------------------------------------------------------------------
  // Webhook routes with 1 MB limit
  // ---------------------------------------------------------------------------

  it('returns 413 when webhook Content-Length exceeds 1 MB on POST /api/webhooks', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const request = makeRequest('/api/webhooks', 'POST', WEBHOOK_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('returns 413 when webhook Content-Length exceeds 1 MB on /api/webhooks/rotate', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const request = makeRequest('/api/webhooks/rotate', 'POST', WEBHOOK_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('returns 413 when webhook Content-Length exceeds 1 MB on /api/webhooks/deliveries', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const request = makeRequest('/api/webhooks/deliveries', 'POST', WEBHOOK_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('passes through when webhook Content-Length is exactly at the 1 MB cap', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const request = makeRequest('/api/webhooks', 'POST', WEBHOOK_CAP);
    const response = await middleware(request as any);

    // Should NOT be a 413 — at-limit is allowed.
    expect(response.status).not.toBe(413);
  });

  it('passes through when webhook Content-Length is below the 1 MB cap', async () => {
    const request = makeRequest('/api/webhooks', 'POST', 512 * 1024); // 512 KB
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  it('passes through when webhook Content-Length is at 768 KB (well below 1 MB)', async () => {
    const request = makeRequest('/api/webhooks/rotate', 'POST', 768 * 1024);
    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);
  });

  it('enforces 1 MB limit for nested webhook paths like /api/webhooks/dlq', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const request = makeRequest('/api/webhooks/dlq', 'POST', WEBHOOK_CAP + 1);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
  });

  it('includes webhook limit in error message', async () => {
    const WEBHOOK_CAP = 1024 * 1024; // 1 MB
    const overLimit = WEBHOOK_CAP + 10000;
    const request = makeRequest('/api/webhooks', 'POST', overLimit);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.error.message).toContain('1048576-byte limit'); // 1 MB in bytes
    expect(body.error.message).toContain(String(overLimit));
  });

  it('honours MAX_WEBHOOK_BODY_BYTES env override', async () => {
    // Re-import with a custom webhook cap of 2 MB
    jest.resetModules();
    (process.env as any).MAX_WEBHOOK_BODY_BYTES = String(2 * 1024 * 1024); // 2 MB
    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const { middleware: mw } = await import('./middleware');

    // 1.5 MB — within the custom 2 MB webhook cap, but exceeds default 1 MB
    const within = makeRequest('/api/webhooks', 'POST', 1.5 * 1024 * 1024);
    const withinResponse = await mw(within as any);
    expect(withinResponse.status).not.toBe(413);

    // 2.5 MB — exceeds the custom 2 MB webhook cap
    const over = makeRequest('/api/webhooks', 'POST', 2.5 * 1024 * 1024);
    const overResponse = await mw(over as any);
    expect(overResponse.status).toBe(413);
  });

  it('does not apply webhook limit to non-webhook routes', async () => {
    // A 512 KB body should be rejected on /api/v2/streams (under 256 KB default)
    // but not be related to webhook limits
    const request = makeRequest('/api/v2/streams', 'POST', 512 * 1024);
    const response = await middleware(request as any);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error.message).toContain('262144-byte limit'); // 256 KB default
  });

  it('does not apply webhook limit to paths similar to webhooks but not exact', async () => {
    // /api/webhook (singular) should not get 1 MB limit
    // Falls through to default 256 KB limit
    const request = makeRequest('/api/webhook', 'POST', 512 * 1024);
    const response = await middleware(request as any);

    // Should be 413 because /api/webhook exceeds the default 256 KB limit
    expect(response.status).toBe(413);
  });
});

// =============================================================================
// Request fingerprinting
// =============================================================================

describe('request fingerprint middleware', () => {
  let middleware: any;

  beforeEach(async () => {
    jest.resetModules();

    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const { resetAuditLogStore } = await import('@/app/lib/audit-log');
    resetAuditLogStore();
    await import('@/lib/fingerprint-audit');
    const imported = await import('./middleware');
    middleware = imported.middleware;
  });

  afterEach(() => {
    delete (process.env as any).STELLAR_NETWORK;
    delete (process.env as any).JWT_SECRET;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).ALLOWED_ORIGINS;
  });

  it('captures a stable fingerprint in the audit log for API requests', async () => {
    const { auditLogStore } = await import('@/app/lib/audit-log');
    const { REQUEST_FINGERPRINT_AUDIT_ACTION } = await import('@/lib/fingerprint');

    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: {
        'accept-encoding': 'gzip',
        'accept-language': 'en-US',
        'user-agent': 'StreamPay-Test/1.0',
        'x-forwarded-for': '203.0.113.10',
        'x-request-id': 'req_fingerprint_middleware_1',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).not.toBe(413);

    const entries = auditLogStore.list({ action: REQUEST_FINGERPRINT_AUDIT_ACTION });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.metadata?.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(entries[0]?.requestId).toBe('req_fingerprint_middleware_1');
  });

  it('includes the fingerprint on 413 responses for oversized bodies', async () => {
    const request = new Request('http://localhost/api/v2/streams', {
      method: 'POST',
      headers: {
        'content-length': String(256 * 1024 + 1),
        'user-agent': 'StreamPay-Test/1.0',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).toBe(413);
    expect(response.headers.get('x-request-fingerprint')).toMatch(/^[a-f0-9]{64}$/);
  });
});
