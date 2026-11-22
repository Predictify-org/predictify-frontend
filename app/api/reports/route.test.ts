/**
 * @jest-environment node
 */

/**
 * Tests for POST /api/reports route
 */
import { POST, _resetRateLimits, MAX_BODY_BYTES } from './route';

describe('POST /api/reports', () => {
  beforeEach(() => {
    _resetRateLimits();
    jest.useRealTimers();
  });

  const createRequest = (
    body: unknown,
    options: {
      contentType?: string | null;
      contentLength?: string;
      ip?: string;
    } = {}
  ): Request => {
    const {
      contentType = 'application/json',
      contentLength,
      ip = '192.168.1.10',
    } = options;

    const headers = new Headers();
    if (contentType !== null) {
      headers.set('content-type', contentType);
    }
    if (contentLength) {
      headers.set('content-length', contentLength);
    }
    headers.set('x-forwarded-for', ip);

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    return new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers,
      body: bodyStr,
    });
  };

  it('submitting a valid report returns 202 and a report id', async () => {
    const req = createRequest({
      marketId: 'market-123',
      reason: 'misleading',
      details: 'The market question is contradictory.',
      evidenceUrl: 'https://example.com/source',
    });

    const res = await POST(req);
    expect(res.status).toBe(202);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.reportId).toBe('string');
    expect(data.reportId).toMatch(/^rep_/);
    expect(data.message).toBeDefined();
  });

  it('rejects wrong content types with 415', async () => {
    const req = createRequest(
      JSON.stringify({ marketId: 'market-123', reason: 'spam' }),
      { contentType: 'text/plain' }
    );

    const res = await POST(req);
    expect(res.status).toBe(415);

    const data = await res.json();
    expect(data.error).toMatch(/Unsupported Media Type/i);
    expect(data.stack).toBeUndefined();
  });

  it('rejects requests with missing Content-Type header with 415', async () => {
    const req = createRequest(
      JSON.stringify({ marketId: 'market-123', reason: 'spam' }),
      { contentType: null }
    );

    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it('rejects oversize bodies with 413 based on Content-Length header', async () => {
    const req = createRequest(
      { marketId: 'market-123', reason: 'spam' },
      { contentLength: String(MAX_BODY_BYTES + 100) }
    );

    const res = await POST(req);
    expect(res.status).toBe(413);

    const data = await res.json();
    expect(data.error).toMatch(/Payload Too Large/i);
  });

  it('rejects oversize bodies with 413 when payload exceeds maximum size', async () => {
    const largeDetails = 'a'.repeat(MAX_BODY_BYTES + 100);
    const req = createRequest(
      JSON.stringify({ marketId: 'market-123', reason: 'spam', details: largeDetails })
    );

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('rejects missing marketId with 400', async () => {
    const req = createRequest({
      reason: 'spam',
      details: 'Some details',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('rejects empty or whitespace marketId with 400', async () => {
    const req = createRequest({
      marketId: '   ',
      reason: 'spam',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects unknown report reason codes with 400', async () => {
    const req = createRequest({
      marketId: 'market-123',
      reason: 'unknown_reason_code',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/Invalid or unknown report reason/i);
  });

  it('accepts details with exactly 1000 characters', async () => {
    const exact1000 = 'x'.repeat(1000);
    const req = createRequest({
      marketId: 'market-1000',
      reason: 'other',
      details: exact1000,
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
  });

  it('rejects 1001-character details with 400', async () => {
    const details1001 = 'x'.repeat(1001);
    const req = createRequest({
      marketId: 'market-1001',
      reason: 'other',
      details: details1001,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/1000 characters/i);
  });

  it('rejects javascript: evidence URL with 400', async () => {
    const req = createRequest({
      marketId: 'market-123',
      reason: 'illegal',
      evidenceUrl: 'javascript:alert("exploit")',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/http or https URL/i);
  });

  it('rejects non-http(s) protocols such as data:, file:, and ftp:', async () => {
    for (const badUrl of [
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://ftp.example.com/file',
      'not-a-valid-url',
    ]) {
      const req = createRequest({
        marketId: 'market-123',
        reason: 'illegal',
        evidenceUrl: badUrl,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    }
  });

  it('strips control characters from text fields while processing report', async () => {
    const req = createRequest({
      marketId: 'market-\x00\x07123',
      reason: 'spam',
      details: 'Spam\x00 content\x08 here',
      evidenceUrl: 'https://example.com/proof',
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
  });

  it('enforces rate limiting per IP and resets after window using fake timers', async () => {
    jest.useFakeTimers();
    const testIp = '203.0.113.42';

    // 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const req = createRequest(
        { marketId: `market-${i}`, reason: 'spam' },
        { ip: testIp }
      );
      const res = await POST(req);
      expect(res.status).toBe(202);
    }

    // 6th request should be rate-limited (429)
    const blockedReq = createRequest(
      { marketId: 'market-over-limit', reason: 'spam' },
      { ip: testIp }
    );
    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();

    const blockedData = await blockedRes.json();
    expect(blockedData.error).toMatch(/Too Many Requests/i);

    // Advance fake timer by 61 seconds (past the 60s window)
    jest.advanceTimersByTime(61 * 1000);

    // After reset, request should succeed again
    const allowedReq = createRequest(
      { marketId: 'market-after-reset', reason: 'spam' },
      { ip: testIp }
    );
    const allowedRes = await POST(allowedReq);
    expect(allowedRes.status).toBe(202);
  });

  it('never exposes internal error stack traces', async () => {
    const req = createRequest('invalid-json{{{', { contentType: 'application/json' });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.stack).toBeUndefined();
    expect(data.error).toBeDefined();
  });
});
