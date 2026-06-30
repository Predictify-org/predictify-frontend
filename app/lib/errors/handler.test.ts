/**
 * Global Error Handler Tests
 */

import {
  GlobalErrorHandler,
  getGlobalErrorHandler,
  resetGlobalErrorHandler,
  handleError,
  handleApiCall,
  getFormErrors,
  hasFieldErrors,
  getFirstFieldError,
  formatErrorForDisplay,
} from './handler';
import { createError } from './mapper';
import type { StreamPayError } from './types';

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    resetGlobalErrorHandler();
  });

  afterEach(() => {
    resetGlobalErrorHandler();
  });

  describe('handleError', () => {
    it('normalizes and handles errors', () => {
      const handler = new GlobalErrorHandler();
      const receivedErrors: StreamPayError[] = [];

      handler.registerHandler((error) => {
        receivedErrors.push(error);
      });

      const error = new Error('Test error');
      const result = handler.handleError(error, 'test-context');

      expect(isStreamPayError(result)).toBe(true);
      expect(receivedErrors).toHaveLength(1);
      expect(receivedErrors[0].category).toBe('unknown');
    });

    it('passes through already normalized errors', () => {
      const handler = new GlobalErrorHandler();
      const existingError = createError('INSUFFICIENT_FUNDS');

      const result = handler.handleError(existingError);

      expect(result).toBe(existingError);
    });

    it('applies filter to skip certain errors', () => {
      const handler = new GlobalErrorHandler({
        filter: (error) => error.code !== 'INSUFFICIENT_FUNDS',
      });
      const receivedErrors: StreamPayError[] = [];

      handler.registerHandler((error) => { receivedErrors.push(error); });

      handler.handleError(createError('INSUFFICIENT_FUNDS'));
      handler.handleError(createError('NOT_FOUND'));

      expect(receivedErrors).toHaveLength(1);
      expect(receivedErrors[0].code).toBe('NOT_FOUND');
    });

    it('deduplicates errors within window', () => {
      const handler = new GlobalErrorHandler({
        deduplicateErrors: true,
        deduplicationWindowMs: 1000,
      });
      const receivedErrors: StreamPayError[] = [];

      handler.registerHandler((error) => { receivedErrors.push(error); });

      const error = createError('NETWORK_TIMEOUT');
      handler.handleError(error);
      handler.handleError(error);
      handler.handleError(error);

      expect(receivedErrors).toHaveLength(1);
    });

    it('limits concurrent errors', () => {
      const handler = new GlobalErrorHandler({
        maxConcurrentErrors: 2,
      });
      const dismissedErrors: StreamPayError[] = [];

      handler.registerHandler((error) => {
        // Track when errors are dismissed (handled: false means new, handled: true means dismissed)
      });

      // Add 3 errors (max is 2, so first should be auto-dismissed)
      handler.handleError(createError('INTERNAL_ERROR'));
      handler.handleError(createError('SERVICE_UNAVAILABLE'));
      handler.handleError(createError('UNKNOWN_ERROR'));

      const active = handler.getActiveErrors();
      expect(active.length).toBeLessThanOrEqual(2);
    });

    it('calls global error callback', () => {
      const callbackEvents: { error: StreamPayError; handled: boolean }[] = [];
      const handler = new GlobalErrorHandler({
        onError: (event) => callbackEvents.push({ error: event.error, handled: event.handled }),
        deduplicateErrors: false, // Disable deduplication for this test
      });

      handler.handleError(new Error('Test'));

      expect(callbackEvents).toHaveLength(1);
      expect(callbackEvents[0].handled).toBe(false);
    });
  });

  describe('handleApiError', () => {
    it('resolves on successful operation', async () => {
      const handler = new GlobalErrorHandler();
      const operation = jest.fn().mockResolvedValue('success');

      const result = await handler.handleApiError(operation, 'test');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors and succeeds', async () => {
      const handler = new GlobalErrorHandler();
      const operation = jest.fn()
        .mockRejectedValueOnce(createError('NETWORK_TIMEOUT'))
        .mockRejectedValueOnce(createError('NETWORK_TIMEOUT'))
        .mockResolvedValueOnce('success');

      const result = await handler.handleApiError(operation, 'test', 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting retries', async () => {
      const handler = new GlobalErrorHandler();
      const operation = jest.fn().mockRejectedValue(createError('NETWORK_TIMEOUT'));

      await expect(handler.handleApiError(operation, 'test', 1)).rejects.toMatchObject({
        code: 'NETWORK_TIMEOUT',
      });

      expect(operation).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('does not retry non-retryable errors', async () => {
      const handler = new GlobalErrorHandler();
      const operation = jest.fn().mockRejectedValue(createError('INSUFFICIENT_FUNDS'));

      await expect(handler.handleApiError(operation, 'test', 3)).rejects.toMatchObject({
        code: 'INSUFFICIENT_FUNDS',
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismissError', () => {
    it('dismisses error by ID', () => {
      const handler = new GlobalErrorHandler();
      let dismissedError: StreamPayError | null = null;

      handler.registerHandler((error) => {
        // Track when errors change (dismissed errors won't appear in active list)
        if (!handler.getActiveErrors().find(e => e.error === error)) {
          dismissedError = error;
        }
      });

      handler.handleError(createError('INTERNAL_ERROR'));
      expect(handler.hasActiveErrors()).toBe(true);
      
      handler.dismissError(1);
      expect(handler.hasActiveErrors()).toBe(false);
    });
  });

  describe('dismissAllErrors', () => {
    it('dismisses all active errors', () => {
      const handler = new GlobalErrorHandler();

      handler.handleError(createError('INTERNAL_ERROR'));
      handler.handleError(createError('SERVICE_UNAVAILABLE'));

      expect(handler.hasActiveErrors()).toBe(true);

      handler.dismissAllErrors();

      expect(handler.hasActiveErrors()).toBe(false);
    });
  });
});

describe('Singleton', () => {
  beforeEach(() => {
    resetGlobalErrorHandler();
  });

  afterEach(() => {
    resetGlobalErrorHandler();
  });

  it('returns same instance', () => {
    const instance1 = getGlobalErrorHandler();
    const instance2 = getGlobalErrorHandler();

    expect(instance1).toBe(instance2);
  });

  it('updates config on existing instance', () => {
    const instance = getGlobalErrorHandler({ maxConcurrentErrors: 5 });
    expect(instance.getActiveErrors().length).toBe(0);

    const sameInstance = getGlobalErrorHandler({ maxConcurrentErrors: 10 });
    expect(sameInstance).toBe(instance);
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    resetGlobalErrorHandler();
  });

  afterEach(() => {
    resetGlobalErrorHandler();
  });

  it('handleError uses global instance', () => {
    const result = handleError(new Error('Test'));
    expect(isStreamPayError(result)).toBe(true);
  });

  it('handleApiCall uses global instance', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await handleApiCall(operation, 'test');
    expect(result).toBe('success');
  });
});

describe('Form error helpers', () => {
  it('getFormErrors extracts field errors', () => {
    const error = createError('VALIDATION_ERROR', {
      meta: {
        fieldErrors: {
          email: 'Invalid email',
          password: 'Too short',
        },
      },
    });

    const fieldErrors = getFormErrors(error);
    expect(fieldErrors).toEqual({
      email: 'Invalid email',
      password: 'Too short',
    });
  });

  it('hasFieldErrors returns true when field errors exist', () => {
    const errorWithFields = createError('VALIDATION_ERROR', {
      meta: {
        fieldErrors: { field: 'Error' },
      },
    });
    const errorWithoutFields = createError('INTERNAL_ERROR');

    expect(hasFieldErrors(errorWithFields)).toBe(true);
    expect(hasFieldErrors(errorWithoutFields)).toBe(false);
  });

  it('getFirstFieldError returns first error message', () => {
    const error = createError('VALIDATION_ERROR', {
      meta: {
        fieldErrors: {
          field1: 'First error',
          field2: 'Second error',
        },
      },
    });

    expect(getFirstFieldError(error)).toBe('First error');
  });

  it('getFirstFieldError returns undefined when no fields', () => {
    const error = createError('INTERNAL_ERROR');
    expect(getFirstFieldError(error)).toBeUndefined();
  });
});

describe('formatErrorForDisplay', () => {
  it('formats error for UI display', () => {
    const error = createError('INSUFFICIENT_FUNDS', {
      requestId: 'req-123',
    });

    const formatted = formatErrorForDisplay(error);

    expect(formatted.title).toBe('Insufficient Funds');
    expect(formatted.message).toBeTruthy();
    expect(formatted.requestId).toBe('req-123');
    expect(formatted.canRetry).toBe(false);
  });

  it('indicates retryable errors', () => {
    const error = createError('NETWORK_TIMEOUT');
    const formatted = formatErrorForDisplay(error);

    expect(formatted.canRetry).toBe(true);
  });
});

// Helper function
function isStreamPayError(error: unknown): error is StreamPayError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'category' in error &&
    'retry' in error
  );
}
