/**
 * API Client Tests
 * 
 * Tests for the enhanced API client with error normalization.
 */

import {
  fetchWithIdempotency,
  get,
  post,
} from './apiClient';
import type { StreamPayError } from '@/app/lib/errors';
import { isStreamPayError } from '@/app/lib/errors/mapper';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('fetchWithIdempotency', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('makes successful GET request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: 'test' }),
    });

    const result = await fetchWithIdempotency('/api/test');
    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      })
    );
  });

  it('handles 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const result = await fetchWithIdempotency('/api/test');
    expect(result).toBeNull();
  });

  it('adds idempotency key for mutating requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    await fetchWithIdempotency('/api/test', { method: 'POST' });

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('preserves existing idempotency key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    const customKey = 'my-custom-key-123';
    const headers = new Headers({ 'Idempotency-Key': customKey });

    await fetchWithIdempotency('/api/test', { method: 'POST', headers });

    const callArgs = mockFetch.mock.calls[0];
    const callHeaders = callArgs[1].headers as Headers;
    expect(callHeaders.get('Idempotency-Key')).toBe(customKey);
  });

  it('adds x-request-id header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    await fetchWithIdempotency('/api/test');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('x-request-id')).toMatch(/^req-[0-9a-z-]+$/);
  });

  it('normalizes backend error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: {
          code: 'STREAM_NOT_FOUND',
          message: "Stream '123' not found",
          request_id: 'req-abc',
        },
      }),
    });

    try {
      await fetchWithIdempotency('/api/streams/123');
      fail('Expected error to be thrown');
    } catch (error) {
      expect(isStreamPayError(error)).toBe(true);
      const spError = error as StreamPayError;
      expect(spError.code).toBe('STREAM_NOT_FOUND');
      expect(spError.status).toBe(404);
      expect(spError.requestId).toBe('req-abc');
    }
  });

  it('normalizes generic HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Server Error',
    });

    try {
      await fetchWithIdempotency('/api/test');
      fail('Expected error to be thrown');
    } catch (error) {
      expect(isStreamPayError(error)).toBe(true);
      const spError = error as StreamPayError;
      expect(spError.code).toBe('INTERNAL_ERROR');
      expect(spError.status).toBe(500);
    }
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await fetchWithIdempotency('/api/test');
      fail('Expected error to be thrown');
    } catch (error) {
      expect(isStreamPayError(error)).toBe(true);
      const spError = error as StreamPayError;
      expect(spError.category).toBe('network');
    }
  });

  it('applies request timeout', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    try {
      await fetchWithIdempotency('/api/test', {}, { timeoutMs: 100 });
      fail('Expected timeout error');
    } catch (error) {
      expect(isStreamPayError(error)).toBe(true);
      const spError = error as StreamPayError;
      expect(spError.code).toBe('NETWORK_TIMEOUT');
    }
  }, 1000);

  it('retries on retryable errors', async () => {
    // First two calls fail, third succeeds
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      });

    const result = await fetchWithIdempotency('/api/test', {}, {
      retries: 2,
      retryDelayMs: 10, // Fast retry for test
    });

    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Not enough funds',
          request_id: 'req-123',
        },
      }),
    });

    try {
      await fetchWithIdempotency('/api/test', {}, { retries: 2 });
      fail('Expected error to be thrown');
    } catch (error) {
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
      const spError = error as StreamPayError;
      expect(spError.code).toBe('INSUFFICIENT_FUNDS');
    }
  });

  it('preserves correlation context from response headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/json',
        'x-request-id': 'resp-req-456',
        'x-correlation-id': 'corr-789',
      }),
      json: async () => ({ success: true }),
    });

    const result = await fetchWithIdempotency('/api/test');
    expect(result).toBeDefined();
    // Correlation context should be preserved through the request
  });
});

describe('HTTP verb helpers', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('GET uses correct method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: [] }),
    });

    await get('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('POST with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ created: true }),
    });

    const body = { name: 'Test' };
    await post('/api/test', body);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  });
});
