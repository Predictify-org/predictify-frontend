/** @jest-environment node */

import {
  DEFAULT_MAX_BODY_BYTES,
  WEBHOOK_MAX_BODY_BYTES,
  WRITE_METHODS,
  resolveMaxBodyBytes,
  isWebhookPath,
  getBodySizeLimit,
  extractPathname,
  createBodySizeTooLargeResponse,
  checkRequestBodySize,
  buildLimitsConfig,
} from './bodySize';
import { NextRequest } from 'next/server';

describe('bodySize', () => {
  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  describe('constants', () => {
    it('exports correct default body size limits', () => {
      expect(DEFAULT_MAX_BODY_BYTES).toBe(256 * 1024); // 262,144 bytes
      expect(WEBHOOK_MAX_BODY_BYTES).toBe(1024 * 1024); // 1,048,576 bytes
    });

    it('exports write methods set', () => {
      expect(WRITE_METHODS).toEqual(new Set(['POST', 'PUT', 'PATCH']));
      expect(WRITE_METHODS.has('GET')).toBe(false);
      expect(WRITE_METHODS.has('DELETE')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveMaxBodyBytes
  // ---------------------------------------------------------------------------

  describe('resolveMaxBodyBytes', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
      jest.clearAllMocks();
    });

    it('returns default when env var is not set', () => {
      delete (process.env as any).TEST_VAR;
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
    });

    it('parses and returns valid numeric env var', () => {
      (process.env as any).TEST_VAR = '500';
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(500);
    });

    it('floors decimal values', () => {
      (process.env as any).TEST_VAR = '123.789';
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(123);
    });

    it('returns default for non-numeric env var', () => {
      (process.env as any).TEST_VAR = 'invalid';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST_VAR="invalid" is not a valid positive number')
      );
      consoleSpy.mockRestore();
    });

    it('returns default for negative numbers', () => {
      (process.env as any).TEST_VAR = '-100';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns default for zero', () => {
      (process.env as any).TEST_VAR = '0';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns default for infinity', () => {
      (process.env as any).TEST_VAR = 'Infinity';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns default for NaN', () => {
      (process.env as any).TEST_VAR = 'NaN';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = resolveMaxBodyBytes('TEST_VAR', 100);
      expect(result).toBe(100);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // isWebhookPath
  // ---------------------------------------------------------------------------

  describe('isWebhookPath', () => {
    it('returns true for /api/webhooks path', () => {
      expect(isWebhookPath('/api/webhooks')).toBe(true);
    });

    it('returns true for /api/webhooks/ path', () => {
      expect(isWebhookPath('/api/webhooks/')).toBe(true);
    });

    it('returns true for /api/webhooks/subpath', () => {
      expect(isWebhookPath('/api/webhooks/rotate')).toBe(true);
      expect(isWebhookPath('/api/webhooks/deliveries')).toBe(true);
      expect(isWebhookPath('/api/webhooks/dlq')).toBe(true);
    });

    it('returns true for /api/webhooks/deeply/nested/path', () => {
      expect(isWebhookPath('/api/webhooks/foo/bar/baz')).toBe(true);
    });

    it('returns false for /api/v2/streams path', () => {
      expect(isWebhookPath('/api/v2/streams')).toBe(false);
    });

    it('returns false for /api/other path', () => {
      expect(isWebhookPath('/api/other')).toBe(false);
    });

    it('returns false for /webhooks (no /api prefix)', () => {
      expect(isWebhookPath('/webhooks')).toBe(false);
    });

    it('returns false for empty path', () => {
      expect(isWebhookPath('')).toBe(false);
    });

    it('returns false for path similar to webhook but different', () => {
      expect(isWebhookPath('/api/webhook')).toBe(false); // singular
      expect(isWebhookPath('/api/webhooks2')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getBodySizeLimit
  // ---------------------------------------------------------------------------

  describe('getBodySizeLimit', () => {
    const limits = { default: 256, webhook: 1024 };

    it('returns webhook limit for webhook paths', () => {
      expect(getBodySizeLimit('/api/webhooks', limits)).toBe(1024);
      expect(getBodySizeLimit('/api/webhooks/rotate', limits)).toBe(1024);
    });

    it('returns default limit for non-webhook paths', () => {
      expect(getBodySizeLimit('/api/v2/streams', limits)).toBe(256);
      expect(getBodySizeLimit('/api/other', limits)).toBe(256);
      expect(getBodySizeLimit('/health', limits)).toBe(256);
    });

    it('uses provided limit values', () => {
      const customLimits = { default: 100, webhook: 2000 };
      expect(getBodySizeLimit('/api/v2/streams', customLimits)).toBe(100);
      expect(getBodySizeLimit('/api/webhooks', customLimits)).toBe(2000);
    });
  });

  // ---------------------------------------------------------------------------
  // extractPathname
  // ---------------------------------------------------------------------------

  describe('extractPathname', () => {
    it('extracts pathname from NextRequest with nextUrl', () => {
      const request = new Request('http://localhost/api/webhooks/rotate', { method: 'POST' });
      const nextRequest = {
        ...request,
        nextUrl: { pathname: '/api/webhooks/rotate' },
      } as any;

      const pathname = extractPathname(nextRequest);
      expect(pathname).toBe('/api/webhooks/rotate');
    });

    it('extracts pathname from plain Request via URL', () => {
      const request = new Request('http://localhost/api/webhooks/rotate', { method: 'POST' });
      const pathname = extractPathname(request);
      expect(pathname).toBe('/api/webhooks/rotate');
    });

    it('prefers nextUrl.pathname when both are available', () => {
      const request = new Request('http://localhost/api/v2/streams', { method: 'POST' });
      const nextRequest = {
        ...request,
        nextUrl: { pathname: '/api/webhooks/rotate' },
      } as any;

      const pathname = extractPathname(nextRequest);
      expect(pathname).toBe('/api/webhooks/rotate');
    });

    it('returns empty string for invalid URL', () => {
      const request = { url: 'not-a-valid-url', method: 'POST' } as any;
      const pathname = extractPathname(request);
      expect(pathname).toBe('');
    });

    it('handles pathname with query string', () => {
      const request = new Request('http://localhost/api/webhooks?param=value', { method: 'POST' });
      const pathname = extractPathname(request);
      expect(pathname).toBe('/api/webhooks');
    });

    it('handles pathname with fragment', () => {
      const request = new Request('http://localhost/api/webhooks#section', { method: 'POST' });
      const pathname = extractPathname(request);
      expect(pathname).toBe('/api/webhooks');
    });
  });

  // ---------------------------------------------------------------------------
  // createBodySizeTooLargeResponse
  // ---------------------------------------------------------------------------

  describe('createBodySizeTooLargeResponse', () => {
    it('creates 413 response with error details', async () => {
      const response = createBodySizeTooLargeResponse(1000, 500, 'req_abc123');

      expect(response.status).toBe(413);
      expect(response.headers.get('content-type')).toContain('application/json');

      const body = await response.json();
      expect(body.error.code).toBe('REQUEST_TOO_LARGE');
      expect(body.error.message).toContain('500-byte limit');
      expect(body.error.message).toContain('1000 bytes');
      expect(body.error.request_id).toBe('req_abc123');
    });

    it('includes correct content length in message', async () => {
      const response = createBodySizeTooLargeResponse(2048576, 1048576, 'req_test');

      const body = await response.json();
      expect(body.error.message).toContain('1048576-byte limit');
      expect(body.error.message).toContain('2048576 bytes');
    });

    it('preserves request ID', async () => {
      const response = createBodySizeTooLargeResponse(100, 50, 'custom_request_id_123');

      const body = await response.json();
      expect(body.error.request_id).toBe('custom_request_id_123');
    });
  });

  // ---------------------------------------------------------------------------
  // checkRequestBodySize
  // ---------------------------------------------------------------------------

  describe('checkRequestBodySize', () => {
    const limits = {
      default: 256 * 1024,
      webhook: 1024 * 1024,
    };

    /**
     * Helper to create a request with specific parameters
     */
    function createRequest(
      url: string,
      method: string,
      contentLength?: number,
      nextUrl?: { pathname: string }
    ): any {
      const headers: HeadersInit = {};
      if (contentLength !== undefined) {
        headers['content-length'] = contentLength.toString();
      }

      const request = new Request(url, { method, headers });

      if (nextUrl) {
        (request as any).nextUrl = nextUrl;
      }

      return request;
    }

    it('returns null for GET requests without checking body size', () => {
      const request = createRequest('http://localhost/api/webhooks', 'GET', 10000000);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for HEAD requests', () => {
      const request = createRequest('http://localhost/api/webhooks', 'HEAD', 10000000);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for OPTIONS requests', () => {
      const request = createRequest('http://localhost/api/webhooks', 'OPTIONS', 10000000);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for DELETE requests', () => {
      const request = createRequest('http://localhost/api/webhooks', 'DELETE', 10000000);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for POST without content-length header', () => {
      const request = createRequest('http://localhost/api/webhooks', 'POST');
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for PUT without content-length header', () => {
      const request = createRequest('http://localhost/api/webhooks', 'PUT');
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for PATCH without content-length header', () => {
      const request = createRequest('http://localhost/api/webhooks', 'PATCH');
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for malformed content-length', () => {
      const request = new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: { 'content-length': 'not-a-number' },
      });
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for negative content-length', () => {
      const request = createRequest('http://localhost/api/webhooks', 'POST', -100);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for infinity content-length', () => {
      const request = new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: { 'content-length': 'Infinity' },
      });
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null for NaN content-length', () => {
      const request = new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: { 'content-length': 'NaN' },
      });
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null when body size is within default limit', () => {
      const bodySize = 100 * 1024; // 100 KB (under 256 KB default)
      const request = createRequest('http://localhost/api/v2/streams', 'POST', bodySize);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null when body size equals default limit', () => {
      const bodySize = 256 * 1024; // exactly 256 KB
      const request = createRequest('http://localhost/api/v2/streams', 'POST', bodySize);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns 413 when body size exceeds default limit', async () => {
      const bodySize = 300 * 1024; // 300 KB (exceeds 256 KB default)
      const request = createRequest('http://localhost/api/v2/streams', 'POST', bodySize);
      request.headers.set('x-request-id', 'req_test123');

      const response = checkRequestBodySize(request, limits);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(413);

      const body = await response!.json();
      expect(body.error.code).toBe('REQUEST_TOO_LARGE');
      expect(body.error.message).toContain('262144-byte limit'); // 256 KB
      expect(body.error.request_id).toBe('req_test123');
    });

    it('returns null when webhook body size is within webhook limit', () => {
      const bodySize = 512 * 1024; // 512 KB (under 1 MB webhook limit)
      const request = createRequest('http://localhost/api/webhooks', 'POST', bodySize);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns null when webhook body size equals webhook limit', () => {
      const bodySize = 1024 * 1024; // exactly 1 MB
      const request = createRequest('http://localhost/api/webhooks', 'POST', bodySize);
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('returns 413 when webhook body size exceeds webhook limit', async () => {
      const bodySize = 2 * 1024 * 1024; // 2 MB (exceeds 1 MB webhook limit)
      const request = createRequest('http://localhost/api/webhooks', 'POST', bodySize);
      request.headers.set('x-request-id', 'req_webhook_test');

      const response = checkRequestBodySize(request, limits);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(413);

      const body = await response!.json();
      expect(body.error.message).toContain('1048576-byte limit'); // 1 MB
      expect(body.error.request_id).toBe('req_webhook_test');
    });

    it('generates request ID when x-request-id header is absent', async () => {
      const bodySize = 300 * 1024; // exceeds default limit
      const request = createRequest('http://localhost/api/v2/streams', 'POST', bodySize);
      // Don't set x-request-id header

      const response = checkRequestBodySize(request, limits);
      const body = await response!.json();
      expect(body.error.request_id).toMatch(/^req_/);
    });

    it('handles requests with invalid pathname gracefully', () => {
      const request = { url: 'invalid', method: 'POST', headers: new Headers() } as any;
      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('supports PUT and PATCH methods alongside POST', () => {
      const bodySize = 100 * 1024;

      const putRequest = createRequest('http://localhost/api/v2/streams/123', 'PUT', bodySize);
      expect(checkRequestBodySize(putRequest, limits)).toBeNull();

      const patchRequest = createRequest('http://localhost/api/v2/streams/123', 'PATCH', bodySize);
      expect(checkRequestBodySize(patchRequest, limits)).toBeNull();
    });

    it('enforces limits on webhook subpaths', async () => {
      const bodySize = 2 * 1024 * 1024; // 2 MB (exceeds 1 MB webhook limit)
      const request = createRequest('http://localhost/api/webhooks/rotate', 'POST', bodySize);

      const response = checkRequestBodySize(request, limits);
      expect(response!.status).toBe(413);

      const body = await response!.json();
      expect(body.error.message).toContain('1048576-byte limit'); // 1 MB
    });

    it('uses nextUrl.pathname when available', () => {
      const bodySize = 300 * 1024; // exceeds default limit for /api/v2/streams
      const request = new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: { 'content-length': bodySize.toString() },
      });
      (request as any).nextUrl = { pathname: '/api/v2/streams' };

      const response = checkRequestBodySize(request, limits);
      expect(response!.status).toBe(413); // should use /api/v2/streams limit
    });

    it('respects custom limit values', async () => {
      const customLimits = { default: 100, webhook: 200 };
      const bodySize = 150;

      // Should exceed default limit
      const defaultRequest = createRequest('http://localhost/api/v2/streams', 'POST', bodySize);
      const defaultResponse = checkRequestBodySize(defaultRequest, customLimits);
      expect(defaultResponse!.status).toBe(413);

      // Should not exceed webhook limit
      const webhookRequest = createRequest('http://localhost/api/webhooks', 'POST', bodySize);
      const webhookResponse = checkRequestBodySize(webhookRequest, customLimits);
      expect(webhookResponse).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // buildLimitsConfig
  // ---------------------------------------------------------------------------

  describe('buildLimitsConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
      jest.clearAllMocks();
    });

    it('returns default limits when env vars are not set', () => {
      delete (process.env as any).MAX_STREAM_BODY_BYTES;
      delete (process.env as any).MAX_WEBHOOK_BODY_BYTES;

      const config = buildLimitsConfig();

      expect(config.default).toBe(DEFAULT_MAX_BODY_BYTES);
      expect(config.webhook).toBe(WEBHOOK_MAX_BODY_BYTES);
    });

    it('uses MAX_STREAM_BODY_BYTES env var for default limit', () => {
      (process.env as any).MAX_STREAM_BODY_BYTES = '131072'; // 128 KB
      delete (process.env as any).MAX_WEBHOOK_BODY_BYTES;

      const config = buildLimitsConfig();

      expect(config.default).toBe(131072);
      expect(config.webhook).toBe(WEBHOOK_MAX_BODY_BYTES); // unchanged
    });

    it('uses MAX_WEBHOOK_BODY_BYTES env var for webhook limit', () => {
      delete (process.env as any).MAX_STREAM_BODY_BYTES;
      (process.env as any).MAX_WEBHOOK_BODY_BYTES = '2097152'; // 2 MB

      const config = buildLimitsConfig();

      expect(config.default).toBe(DEFAULT_MAX_BODY_BYTES); // unchanged
      expect(config.webhook).toBe(2097152);
    });

    it('uses both env vars when both are set', () => {
      (process.env as any).MAX_STREAM_BODY_BYTES = '131072';
      (process.env as any).MAX_WEBHOOK_BODY_BYTES = '2097152';

      const config = buildLimitsConfig();

      expect(config.default).toBe(131072);
      expect(config.webhook).toBe(2097152);
    });

    it('handles invalid env var values gracefully', () => {
      (process.env as any).MAX_STREAM_BODY_BYTES = 'invalid';
      (process.env as any).MAX_WEBHOOK_BODY_BYTES = 'also-invalid';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = buildLimitsConfig();

      expect(config.default).toBe(DEFAULT_MAX_BODY_BYTES);
      expect(config.webhook).toBe(WEBHOOK_MAX_BODY_BYTES);
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('returns object with correct structure', () => {
      const config = buildLimitsConfig();

      expect(config).toHaveProperty('default');
      expect(config).toHaveProperty('webhook');
      expect(typeof config.default).toBe('number');
      expect(typeof config.webhook).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Integration Tests
  // ---------------------------------------------------------------------------

  describe('integration', () => {
    it('end-to-end: default route with large body is rejected', async () => {
      const limits = buildLimitsConfig();
      const bodySize = 300 * 1024; // exceeds default 256 KB
      const request = new Request('http://localhost/api/v2/streams', {
        method: 'POST',
        headers: { 'content-length': bodySize.toString() },
      });

      const response = checkRequestBodySize(request, limits);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(413);
    });

    it('end-to-end: webhook route with large body within limit is accepted', () => {
      const limits = buildLimitsConfig();
      const bodySize = 512 * 1024; // 512 KB (within 1 MB webhook limit)
      const request = new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: { 'content-length': bodySize.toString() },
      });

      const response = checkRequestBodySize(request, limits);
      expect(response).toBeNull();
    });

    it('end-to-end: webhook route with very large body is rejected', async () => {
      const limits = buildLimitsConfig();
      const bodySize = 2 * 1024 * 1024; // 2 MB (exceeds 1 MB webhook limit)
      const request = new Request('http://localhost/api/webhooks/rotate', {
        method: 'POST',
        headers: { 'content-length': bodySize.toString(), 'x-request-id': 'req_webhook_123' },
      });

      const response = checkRequestBodySize(request, limits);
      expect(response!.status).toBe(413);

      const body = await response!.json();
      expect(body.error.request_id).toBe('req_webhook_123');
    });
  });
});
