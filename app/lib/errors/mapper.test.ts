/**
 * Error Mapper Tests
 * 
 * Tests for error normalization and mapping functionality.
 */

import {
  normalizeError,
  normalizeBackendError,
  normalizeHorizonError,
  normalizeNetworkError,
  isStreamPayError,
  isBackendApiErrorResponse,
  isHorizonError,
  isNetworkError,
  createError,
} from './mapper';
import type { StreamPayError, BackendApiErrorResponse, HorizonError } from './types';

describe('normalizeBackendError', () => {
  it('normalizes backend API error response', () => {
    const response: BackendApiErrorResponse = {
      error: {
        code: 'STREAM_NOT_FOUND',
        message: "Stream 'stream-xyz' not found",
        request_id: 'req-123',
      },
    };

    const result = normalizeBackendError(response, 404);

    expect(result.code).toBe('STREAM_NOT_FOUND');
    expect(result.status).toBe(404);
    expect(result.requestId).toBe('req-123');
    expect(result.category).toBe('client');
    expect(result.retry.retryable).toBe(false);
  });

  it('maps backend error codes to frontend codes', () => {
    const testCases = [
      { backend: 'VALIDATION_ERROR', frontend: 'VALIDATION_ERROR' },
      { backend: 'UNAUTHORIZED', frontend: 'UNAUTHORIZED' },
      { backend: 'SETTLEMENT_FAILED', frontend: 'SETTLEMENT_FAILED' },
    ];

    for (const { backend, frontend } of testCases) {
      const response: BackendApiErrorResponse = {
        error: {
          code: backend,
          message: 'Test error',
          request_id: 'req-123',
        },
      };

      const result = normalizeBackendError(response, 400);
      expect(result.code).toBe(frontend);
    }
  });

  it('extracts field errors from validation response', () => {
    const response: BackendApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        request_id: 'req-123',
        details: {
          fieldErrors: {
            recipient: 'Recipient is required',
            rate: 'Rate must be positive',
          },
        },
      },
    };

    const result = normalizeBackendError(response, 422);
    expect(result.meta?.fieldErrors).toEqual({
      recipient: 'Recipient is required',
      rate: 'Rate must be positive',
    });
  });

  it('includes debug info in development mode', () => {
    const response: BackendApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Server error',
        request_id: 'req-123',
      },
    };

    const result = normalizeBackendError(response, 500, {
      environment: 'development',
      includeDebug: true,
    });

    expect(result.debug).toBeDefined();
    expect(result.debug?.originalCode).toBe('INTERNAL_ERROR');
    expect(result.debug?.timestamp).toBeDefined();
  });

  it('excludes debug info in production mode', () => {
    const response: BackendApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Server error',
        request_id: 'req-123',
      },
    };

    const result = normalizeBackendError(response, 500, {
      environment: 'production',
      includeDebug: true, // Should be ignored in production
    });

    expect(result.debug).toBeUndefined();
  });
});

describe('normalizeHorizonError', () => {
  it('normalizes Stellar Horizon error', () => {
    const horizonError: HorizonError = {
      type: 'https://stellar.org/horizon-errors/transaction_failed',
      title: 'Transaction Failed',
      status: 400,
      detail: 'Transaction failed on Stellar network',
      extras: {
        result_codes: {
          transaction: 'tx_failed',
          operations: ['op_underfunded'],
        },
      },
    };

    const result = normalizeHorizonError(horizonError);

    expect(result.code).toBe('INSUFFICIENT_FUNDS');
    expect(result.category).toBe('blockchain');
    expect(result.status).toBe(400);
  });

  it('maps operation result codes correctly', () => {
    const testCases = [
      { op: 'op_underfunded', code: 'INSUFFICIENT_FUNDS' },
      { op: 'op_bad_auth', code: 'INVALID_SIGNATURE' },
      { op: 'op_no_trust', code: 'TRUSTLINE_MISSING' },
    ];

    for (const { op, code } of testCases) {
      const horizonError: HorizonError = {
        type: 'transaction_failed',
        title: 'Failed',
        status: 400,
        extras: {
          result_codes: {
            operations: [op],
          },
        },
      };

      const result = normalizeHorizonError(horizonError);
      expect(result.code).toBe(code);
    }
  });

  it('falls back to HTTP status when no operation codes', () => {
    const horizonError: HorizonError = {
      type: 'not_found',
      title: 'Not Found',
      status: 404,
    };

    const result = normalizeHorizonError(horizonError);
    expect(result.code).toBe('NOT_FOUND');
  });
});

describe('normalizeNetworkError', () => {
  it('normalizes network timeout error', () => {
    const error = new Error('Request timeout');
    const result = normalizeNetworkError(error);

    expect(result.code).toBe('NETWORK_TIMEOUT');
    expect(result.category).toBe('network');
    expect(result.retry.retryable).toBe(true);
  });

  it('normalizes network unavailable error', () => {
    const error = new Error('Network request failed');
    const result = normalizeNetworkError(error);

    expect(result.code).toBe('NETWORK_UNAVAILABLE');
    expect(result.category).toBe('network');
  });

  it('normalizes DNS lookup failure', () => {
    const error = new Error('getaddrinfo ENOTFOUND api.streampay.io');
    const result = normalizeNetworkError(error);

    expect(result.code).toBe('DNS_LOOKUP_FAILED');
  });

  it('normalizes connection reset', () => {
    const error = new Error('read ECONNRESET');
    const result = normalizeNetworkError(error);

    expect(result.code).toBe('CONNECTION_RESET');
  });

  it('excludes debug info in production', () => {
    const error = new Error('Network error');
    const result = normalizeNetworkError(error, {
      environment: 'production',
      includeDebug: true,
    });

    expect(result.debug).toBeUndefined();
  });
});

describe('normalizeError', () => {
  it('returns StreamPayError as-is if already normalized', () => {
    const existingError: StreamPayError = {
      type: 'https://api.streampay.io/errors/insufficient-funds',
      code: 'INSUFFICIENT_FUNDS',
      title: 'Insufficient Funds',
      detail: 'Not enough funds',
      status: 400,
      category: 'blockchain',
      retry: { retryable: false },
    };

    const result = normalizeError(existingError);
    expect(result).toBe(existingError);
  });

  it('normalizes backend error response object', () => {
    const error = {
      error: {
        code: 'STREAM_NOT_FOUND',
        message: 'Stream not found',
        request_id: 'req-123',
      },
    };

    const result = normalizeError(error);
    expect(result.code).toBe('STREAM_NOT_FOUND');
  });

  it('normalizes generic Error objects', () => {
    const error = new Error('Something went wrong');
    const result = normalizeError(error);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.category).toBe('unknown');
  });

  it('normalizes network TypeErrors', () => {
    const error = new TypeError('Failed to fetch');
    const result = normalizeError(error);

    expect(result.category).toBe('network');
  });

  it('normalizes string errors', () => {
    const result = normalizeError('Something broke');
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('normalizes null/undefined', () => {
    expect(normalizeError(null).code).toBe('UNKNOWN_ERROR');
    expect(normalizeError(undefined).code).toBe('UNKNOWN_ERROR');
  });
});

describe('Type Guards', () => {
  describe('isStreamPayError', () => {
    it('returns true for valid StreamPayError', () => {
      const error: StreamPayError = {
        type: 'test',
        code: 'UNKNOWN_ERROR',
        title: 'Test',
        detail: 'Test detail',
        status: 400,
        category: 'client',
        retry: { retryable: false },
      };

      expect(isStreamPayError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
      expect(isStreamPayError(new Error('test'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isStreamPayError(null)).toBe(false);
    });
  });

  describe('isBackendApiErrorResponse', () => {
    it('returns true for valid backend response', () => {
      const response: BackendApiErrorResponse = {
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Test',
          request_id: 'req-123',
        },
      };

      expect(isBackendApiErrorResponse(response)).toBe(true);
    });

    it('returns false for invalid structure', () => {
      expect(isBackendApiErrorResponse({ error: 'test' })).toBe(false);
      expect(isBackendApiErrorResponse(null)).toBe(false);
    });
  });

  describe('isHorizonError', () => {
    it('returns true for valid Horizon error', () => {
      const error: HorizonError = {
        type: 'test',
        title: 'Test',
        status: 400,
      };

      expect(isHorizonError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
      expect(isHorizonError(new Error('test'))).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('returns true for TypeError', () => {
      expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('returns true for network-related messages', () => {
      const messages = [
        'Network error',
        'Connection timeout',
        'DNS lookup failed',
        'fetch failed',
      ];

      for (const message of messages) {
        expect(isNetworkError(new Error(message))).toBe(true);
      }
    });

    it('returns false for unrelated errors', () => {
      expect(isNetworkError(new Error('Parse error'))).toBe(false);
      expect(isNetworkError(new Error('Invalid state'))).toBe(false);
    });
  });
});

describe('createError', () => {
  it('creates error from code', () => {
    const error = createError('INSUFFICIENT_FUNDS');

    expect(error.code).toBe('INSUFFICIENT_FUNDS');
    expect(error.type).toBe('https://api.streampay.io/errors/insufficient-funds');
    expect(error.category).toBe('blockchain');
  });

  it('applies overrides', () => {
    const error = createError('INTERNAL_ERROR', {
      detail: 'Custom message',
      status: 503,
    });

    expect(error.detail).toBe('Custom message');
    expect(error.status).toBe(503);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('includes requestId from options', () => {
    const error = createError('UNKNOWN_ERROR', {}, { requestId: 'req-abc' });
    expect(error.requestId).toBe('req-abc');
  });
});
