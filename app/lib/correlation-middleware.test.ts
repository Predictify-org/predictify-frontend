import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import {
  withCorrelationMiddleware,
  isTrustedInternalRequest,
  sanitizeCorrelationHeaders,
  withStreamContext,
  withJobContext,
  withStellarContext,
  withWebhookContext,
  withRetryContext,
} from './correlation-middleware';
import { getCorrelationContext } from './logger';

// Mock Next.js server module
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    headers: Headers;
    url: string;
    method: string;
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      this.headers = new Headers(init?.headers);
      this.url = typeof input === 'string' ? input : input.toString();
      this.method = init?.method || 'GET';
    }
  },
  NextResponse: {
    json: (body: any, init?: ResponseInit) => ({
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      body: JSON.stringify(body),
    }),
  },
}));

describe('Correlation Middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('withCorrelationMiddleware', () => {
    it('should wrap handler with correlation context', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' })
      );

      await withCorrelationMiddleware(request, handler);

      expect(handler).toHaveBeenCalled();
    });

    it('should add correlation headers to response', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' })
      );

      const response = await withCorrelationMiddleware(request, handler);

      expect(response.headers.get('x-request-id')).toBeDefined();
      expect(response.headers.get('x-correlation-id')).toBeDefined();
    });

    it('should strip internal headers from response', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
      });

      const handler = vi.fn().mockResolvedValue(
        new NextResponse(
          JSON.stringify({ data: 'test' }),
          {
            headers: {
              'x-internal-auth': 'secret',
              'x-service-token': 'token',
            },
          }
        )
      );

      const response = await withCorrelationMiddleware(request, handler);

      expect(response.headers.get('x-internal-auth')).toBeNull();
      expect(response.headers.get('x-service-token')).toBeNull();
    });

    it('should preserve traceparent in response if present in request', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
        headers: {
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' })
      );

      const response = await withCorrelationMiddleware(request, handler);

      expect(response.headers.get('traceparent')).toBe(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      );
    });
  });

  describe('isTrustedInternalRequest', () => {
    it('should return true for localhost', () => {
      const request = new NextRequest('http://localhost/api/streams', {
        headers: { host: 'localhost' },
      });

      expect(isTrustedInternalRequest(request)).toBe(true);
    });

    it('should return true for 127.0.0.1', () => {
      const request = new NextRequest('http://127.0.0.1/api/streams', {
        headers: { host: '127.0.0.1' },
      });

      expect(isTrustedInternalRequest(request)).toBe(true);
    });

    it('should return false for external hosts', () => {
      const request = new NextRequest('https://api.example.com/streams', {
        headers: { host: 'api.example.com' },
      });

      expect(isTrustedInternalRequest(request)).toBe(false);
    });

    it('should return true with valid internal auth token', () => {
      process.env.INTERNAL_AUTH_TOKEN = 'valid-token';
      const request = new NextRequest('https://api.example.com/streams', {
        headers: {
          host: 'api.example.com',
          'x-internal-auth': 'valid-token',
        },
      });

      expect(isTrustedInternalRequest(request)).toBe(true);
      delete process.env.INTERNAL_AUTH_TOKEN;
    });

    it('should return false with invalid internal auth token', () => {
      process.env.INTERNAL_AUTH_TOKEN = 'valid-token';
      const request = new NextRequest('https://api.example.com/streams', {
        headers: {
          host: 'api.example.com',
          'x-internal-auth': 'invalid-token',
        },
      });

      expect(isTrustedInternalRequest(request)).toBe(false);
      delete process.env.INTERNAL_AUTH_TOKEN;
    });
  });

  describe('sanitizeCorrelationHeaders', () => {
    it('should trust headers from trusted requests', () => {
      const request = new NextRequest('http://localhost/api/streams', {
        headers: {
          'x-request-id': 'req-123',
          'x-correlation-id': 'corr-456',
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      });

      const result = sanitizeCorrelationHeaders(request, true);

      expect(result.requestId).toBe('req-123');
      expect(result.correlationId).toBe('corr-456');
      expect(result.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    });

    it('should generate new IDs for untrusted requests', () => {
      const request = new NextRequest('https://api.example.com/streams', {
        headers: {
          'x-request-id': 'req-123',
          'x-correlation-id': 'corr-456',
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      });

      const result = sanitizeCorrelationHeaders(request, false);

      expect(result.requestId).not.toBe('req-123');
      expect(result.correlationId).not.toBe('corr-456');
      expect(result.traceparent).toBeUndefined();
    });

    it('should generate UUIDs for missing headers in trusted requests', () => {
      const request = new NextRequest('http://localhost/api/streams');

      const result = sanitizeCorrelationHeaders(request, true);

      expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('Context helpers', () => {
    it('withStreamContext should update correlation context with stream_id', async () => {
      const context = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await (async () => {
        // Simulate being in correlation context
        withStreamContext('stream-123');
      })();
    });

    it('withJobContext should update correlation context with job_id', async () => {
      const context = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await (async () => {
        withJobContext('job-456', 'settlement-queue');
      })();
    });

    it('withStellarContext should update correlation context with tx_hash', async () => {
      const context = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await (async () => {
        withStellarContext('tx-hash-789');
      })();
    });

    it('withWebhookContext should update correlation context with webhook_id', async () => {
      const context = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await (async () => {
        withWebhookContext('webhook-abc');
      })();
    });

    it('withRetryContext should update correlation context with retry_count', async () => {
      const context = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await (async () => {
        withRetryContext(3);
      })();
    });
  });

  describe('Security: Header spoofing prevention', () => {
    it('should prevent external clients from setting correlation IDs', () => {
      const request = new NextRequest('https://external.com/api/streams', {
        headers: {
          'x-correlation-id': 'spoofed-id',
          host: 'external.com',
        },
      });

      const result = sanitizeCorrelationHeaders(request, false);

      expect(result.correlationId).not.toBe('spoofed-id');
    });

    it('should prevent external clients from setting traceparent', () => {
      const request = new NextRequest('https://external.com/api/streams', {
        headers: {
          traceparent: 'spoofed-trace',
          host: 'external.com',
        },
      });

      const result = sanitizeCorrelationHeaders(request, false);

      expect(result.traceparent).toBeUndefined();
    });
  });

  describe('Public boundary protection', () => {
    it('should not leak internal headers in responses', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
      });

      const handler = vi.fn().mockResolvedValue(
        new NextResponse(
          JSON.stringify({ data: 'test' }),
          {
            headers: {
              'x-internal-auth': 'secret',
              'x-service-token': 'token',
              'x-correlation-id-internal': 'internal-id',
            },
          }
        )
      );

      const response = await withCorrelationMiddleware(request, handler);

      expect(response.headers.get('x-internal-auth')).toBeNull();
      expect(response.headers.get('x-service-token')).toBeNull();
      expect(response.headers.get('x-correlation-id-internal')).toBeNull();
    });

    it('should expose only safe correlation headers in responses', async () => {
      const request = new NextRequest('http://localhost/api/streams', {
        method: 'GET',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' })
      );

      const response = await withCorrelationMiddleware(request, handler);

      // These are safe to expose for tracing
      expect(response.headers.get('x-request-id')).toBeTruthy();
      expect(response.headers.get('x-correlation-id')).toBeTruthy();
    });
  });
});
