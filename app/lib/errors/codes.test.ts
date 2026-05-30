/**
 * Error Codes and Registry Tests
 */

import {
  ERROR_REGISTRY,
  HORIZON_ERROR_MAPPING,
  BACKEND_ERROR_CODE_MAPPING,
  getErrorMetadata,
  isRetryableError,
  getRetryGuidance,
  getUserMessage,
  getErrorCodeForHttpStatus,
  type ErrorCode,
} from './codes';

describe('ERROR_REGISTRY', () => {
  it('contains all required error codes', () => {
    const requiredCodes: ErrorCode[] = [
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'UNPROCESSABLE_ENTITY',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'INSUFFICIENT_FUNDS',
      'TRANSACTION_FAILED',
      'NETWORK_TIMEOUT',
      'UNKNOWN_ERROR',
    ];

    for (const code of requiredCodes) {
      expect(ERROR_REGISTRY[code]).toBeDefined();
    }
  });

  it('each error has required fields', () => {
    for (const [code, metadata] of Object.entries(ERROR_REGISTRY)) {
      expect(metadata.code).toBe(code);
      expect(metadata.httpStatus).toBeDefined();
      expect(metadata.category).toBeDefined();
      expect(metadata.title).toBeTruthy();
      expect(metadata.userMessage).toBeTruthy();
      expect(metadata.technicalDescription).toBeTruthy();
      expect(metadata.retry).toBeDefined();
      expect(metadata.typeUri).toMatch(/^https:\/\/api\.streampay\.io\/errors/);
    }
  });

  it('has valid retry configuration', () => {
    for (const metadata of Object.values(ERROR_REGISTRY)) {
      expect(typeof metadata.retry.retryable).toBe('boolean');
      
      if (metadata.retry.retryable) {
        expect(metadata.retry.maxRetries).toBeGreaterThanOrEqual(1);
        expect(metadata.retry.suggestedDelayMs).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('getErrorMetadata', () => {
  it('returns metadata for valid error code', () => {
    const metadata = getErrorMetadata('INSUFFICIENT_FUNDS');
    expect(metadata.code).toBe('INSUFFICIENT_FUNDS');
    expect(metadata.category).toBe('blockchain');
  });

  it('returns UNKNOWN_ERROR for invalid code', () => {
    const metadata = getErrorMetadata('INVALID_CODE' as ErrorCode);
    expect(metadata.code).toBe('UNKNOWN_ERROR');
  });
});

describe('isRetryableError', () => {
  it('returns true for retryable errors', () => {
    expect(isRetryableError('NETWORK_TIMEOUT')).toBe(true);
    expect(isRetryableError('RATE_LIMITED')).toBe(true);
    expect(isRetryableError('INTERNAL_ERROR')).toBe(true);
  });

  it('returns false for non-retryable errors', () => {
    expect(isRetryableError('INSUFFICIENT_FUNDS')).toBe(false);
    expect(isRetryableError('UNAUTHORIZED')).toBe(false);
    expect(isRetryableError('VALIDATION_ERROR')).toBe(false);
  });
});

describe('getRetryGuidance', () => {
  it('returns retry guidance for error code', () => {
    const guidance = getRetryGuidance('NETWORK_TIMEOUT');
    expect(guidance.retryable).toBe(true);
    expect(guidance.maxRetries).toBe(3);
    expect(guidance.useExponentialBackoff).toBe(true);
  });

  it('returns default for unknown code', () => {
    const guidance = getRetryGuidance('INVALID' as ErrorCode);
    expect(guidance.retryable).toBe(false);
  });
});

describe('getUserMessage', () => {
  it('returns user-friendly message for error code', () => {
    const message = getUserMessage('INSUFFICIENT_FUNDS');
    expect(message).toContain('funds');
    expect(message).not.toContain('technical');
  });

  it('returns fallback message for unknown code', () => {
    const message = getUserMessage('INVALID' as ErrorCode);
    expect(message).toBe(ERROR_REGISTRY.UNKNOWN_ERROR.userMessage);
  });
});

describe('getErrorCodeForHttpStatus', () => {
  it('maps HTTP status codes correctly', () => {
    expect(getErrorCodeForHttpStatus(400)).toBe('BAD_REQUEST');
    expect(getErrorCodeForHttpStatus(401)).toBe('UNAUTHORIZED');
    expect(getErrorCodeForHttpStatus(403)).toBe('FORBIDDEN');
    expect(getErrorCodeForHttpStatus(404)).toBe('NOT_FOUND');
    expect(getErrorCodeForHttpStatus(409)).toBe('CONFLICT');
    expect(getErrorCodeForHttpStatus(422)).toBe('UNPROCESSABLE_ENTITY');
    expect(getErrorCodeForHttpStatus(429)).toBe('RATE_LIMITED');
    expect(getErrorCodeForHttpStatus(500)).toBe('INTERNAL_ERROR');
    expect(getErrorCodeForHttpStatus(503)).toBe('SERVICE_UNAVAILABLE');
    expect(getErrorCodeForHttpStatus(504)).toBe('GATEWAY_TIMEOUT');
  });

  it('returns UNKNOWN_ERROR for unmapped status', () => {
    expect(getErrorCodeForHttpStatus(418)).toBe('UNKNOWN_ERROR');
    expect(getErrorCodeForHttpStatus(999)).toBe('UNKNOWN_ERROR');
  });
});

describe('HORIZON_ERROR_MAPPING', () => {
  it('maps Stellar operation errors correctly', () => {
    expect(HORIZON_ERROR_MAPPING['op_underfunded']).toBe('INSUFFICIENT_FUNDS');
    expect(HORIZON_ERROR_MAPPING['op_bad_auth']).toBe('INVALID_SIGNATURE');
    expect(HORIZON_ERROR_MAPPING['op_no_trust']).toBe('TRUSTLINE_MISSING');
    expect(HORIZON_ERROR_MAPPING['tx_failed']).toBe('TRANSACTION_FAILED');
  });

  it('maps transaction errors correctly', () => {
    expect(HORIZON_ERROR_MAPPING['tx_bad_auth']).toBe('INVALID_SIGNATURE');
    expect(HORIZON_ERROR_MAPPING['tx_bad_seq']).toBe('SEQUENCE_NUMBER_INVALID');
    expect(HORIZON_ERROR_MAPPING['tx_timeout']).toBe('TRANSACTION_TIMEOUT');
  });
});

describe('BACKEND_ERROR_CODE_MAPPING', () => {
  it('maps backend error codes correctly', () => {
    expect(BACKEND_ERROR_CODE_MAPPING['VALIDATION_ERROR']).toBe('VALIDATION_ERROR');
    expect(BACKEND_ERROR_CODE_MAPPING['UNAUTHORIZED']).toBe('UNAUTHORIZED');
    expect(BACKEND_ERROR_CODE_MAPPING['STREAM_NOT_FOUND']).toBe('STREAM_NOT_FOUND');
    expect(BACKEND_ERROR_CODE_MAPPING['SETTLEMENT_FAILED']).toBe('SETTLEMENT_FAILED');
  });
});
