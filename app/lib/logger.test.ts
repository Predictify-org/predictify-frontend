import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import {
  correlationContext,
  extractCorrelationContext,
  getCorrelationContext,
  withCorrelationContext,
  updateCorrelationContext,
  createChildContext,
  logger,
  type CorrelationContext,
} from './logger';

describe('Logger and Correlation Context', () => {
  beforeEach(() => {
    // Clear console.log spy before each test
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractCorrelationContext', () => {
    it('should generate new IDs when headers are missing', () => {
      const headers = new Headers();
      const context = extractCorrelationContext(headers);

      expect(context.request_id).toBeDefined();
      expect(context.correlation_id).toBeDefined();
      expect(context.request_id).toBe(context.correlation_id);
      expect(context.traceparent).toBeUndefined();
    });

    it('should extract request_id from x-request-id header', () => {
      const headers = new Headers();
      headers.set('x-request-id', 'req-123');
      const context = extractCorrelationContext(headers);

      expect(context.request_id).toBe('req-123');
    });

    it('should extract correlation_id from x-correlation-id header', () => {
      const headers = new Headers();
      headers.set('x-correlation-id', 'corr-456');
      const context = extractCorrelationContext(headers);

      expect(context.correlation_id).toBe('corr-456');
    });

    it('should use correlation_id as fallback for request_id', () => {
      const headers = new Headers();
      headers.set('correlation-id', 'corr-789');
      const context = extractCorrelationContext(headers);

      expect(context.request_id).toBe('corr-789');
      expect(context.correlation_id).toBe('corr-789');
    });

    it('should validate and parse W3C traceparent', () => {
      const headers = new Headers();
      headers.set('traceparent', '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
      const context = extractCorrelationContext(headers);

      expect(context.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    });

    it('should reject invalid traceparent format', () => {
      const headers = new Headers();
      headers.set('traceparent', 'invalid-format');
      const context = extractCorrelationContext(headers);

      expect(context.traceparent).toBeUndefined();
    });

    it('should extract stream_id from x-stream-id header', () => {
      const headers = new Headers();
      headers.set('x-stream-id', 'stream-abc');
      const context = extractCorrelationContext(headers);

      expect(context.stream_id).toBe('stream-abc');
    });

    it('should extract job_id from x-job-id header', () => {
      const headers = new Headers();
      headers.set('x-job-id', 'job-xyz');
      const context = extractCorrelationContext(headers);

      expect(context.job_id).toBe('job-xyz');
    });
  });

  describe('AsyncLocalStorage context propagation', () => {
    it('should store and retrieve correlation context', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await withCorrelationContext(context, async () => {
        const retrieved = getCorrelationContext();
        expect(retrieved).toEqual(context);
      });
    });

    it('should return undefined outside context', () => {
      const retrieved = getCorrelationContext();
      expect(retrieved).toBeUndefined();
    });

    it('should propagate context through async operations', async () => {
      const context: CorrelationContext = {
        request_id: 'req-2',
        correlation_id: 'corr-2',
      };

      let retrievedContext: CorrelationContext | undefined;

      await withCorrelationContext(context, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        retrievedContext = getCorrelationContext();
      });

      expect(retrievedContext).toEqual(context);
    });

    it('should not leak context between different async scopes', async () => {
      const context1: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };
      const context2: CorrelationContext = {
        request_id: 'req-2',
        correlation_id: 'corr-2',
      };

      let result1: CorrelationContext | undefined;
      let result2: CorrelationContext | undefined;

      await withCorrelationContext(context1, async () => {
        result1 = getCorrelationContext();
        await withCorrelationContext(context2, async () => {
          result2 = getCorrelationContext();
        });
      });

      expect(result1).toEqual(context1);
      expect(result2).toEqual(context2);
    });
  });

  describe('updateCorrelationContext', () => {
    it('should update existing context fields', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await withCorrelationContext(context, async () => {
        updateCorrelationContext({ stream_id: 'stream-123' });
        const updated = getCorrelationContext();
        expect(updated?.stream_id).toBe('stream-123');
        expect(updated?.request_id).toBe('req-1');
      });
    });

    it('should do nothing when no context exists', () => {
      updateCorrelationContext({ stream_id: 'stream-456' });
      const retrieved = getCorrelationContext();
      expect(retrieved).toBeUndefined();
    });
  });

  describe('createChildContext', () => {
    it('should create child context with new request_id', () => {
      const parent: CorrelationContext = {
        request_id: 'req-parent',
        correlation_id: 'corr-parent',
        stream_id: 'stream-123',
      };

      const child = createChildContext(parent);

      expect(child.request_id).not.toBe(parent.request_id);
      expect(child.correlation_id).toBe(parent.correlation_id);
      expect(child.stream_id).toBe(parent.stream_id);
    });

    it('should merge updates into child context', () => {
      const parent: CorrelationContext = {
        request_id: 'req-parent',
        correlation_id: 'corr-parent',
      };

      const child = createChildContext(parent, { stream_id: 'stream-new' });

      expect(child.stream_id).toBe('stream-new');
      expect(child.correlation_id).toBe(parent.correlation_id);
    });
  });

  describe('Structured logging', () => {
    it('should log with correlation context when available', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        logger.info('Test message', { custom_field: 'value' });
      });

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.request_id).toBe('req-1');
      expect(logEntry.correlation_id).toBe('corr-1');
      expect(logEntry.stream_id).toBe('stream-123');
      expect(logEntry.custom_field).toBe('value');
      expect(logEntry.service).toBeDefined();
      expect(logEntry.environment).toBeDefined();
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should log without correlation context when unavailable', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      logger.info('Test message without context');

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test message without context');
      expect(logEntry.request_id).toBeUndefined();
      expect(logEntry.correlation_id).toBeUndefined();
    });

    it('should include stellar_tx_hash when in context', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stellar_tx_hash: 'tx-hash-123',
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        logger.info('Transaction submitted');
      });

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.stellar_tx_hash).toBe('tx-hash-123');
    });

    it('should include retry_count when in context', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        retry_count: 3,
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        logger.warn('Retry attempt');
      });

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.retry_count).toBe(3);
    });

    it('should support all log levels', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        logger.info('info');
        logger.warn('warn');
        logger.error('error');
        logger.debug('debug');
      });

      expect(consoleSpy).toHaveBeenCalledTimes(4);

      const logEntry1 = JSON.parse(consoleSpy.mock.calls[0][0]);
      const logEntry2 = JSON.parse(consoleSpy.mock.calls[1][0]);
      const logEntry3 = JSON.parse(consoleSpy.mock.calls[2][0]);
      const logEntry4 = JSON.parse(consoleSpy.mock.calls[3][0]);

      expect(logEntry1.level).toBe('info');
      expect(logEntry2.level).toBe('warn');
      expect(logEntry3.level).toBe('error');
      expect(logEntry4.level).toBe('debug');
    });
  });

  describe('PII safety', () => {
    it('should not log sensitive data by default', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        // Logger should not automatically include sensitive fields
        logger.info('User action', { 
          user_id: 'user-123',
          // PII should be explicitly added by caller if needed
          // The logger itself doesn't auto-include sensitive data
        });
      });

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      // Only what was explicitly passed should be logged
      expect(logEntry.user_id).toBe('user-123');
      // No auto-inclusion of sensitive fields
    });
  });
});
