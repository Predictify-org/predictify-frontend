import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { MockQueue, settlementQueue } from './queue';
import { withCorrelationContext, logger, type CorrelationContext } from './logger';

describe('Mock Queue System', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    settlementQueue.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Job enqueue with correlation context', () => {
    it('should enqueue job with correlation context', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
      };

      await withCorrelationContext(context, async () => {
        const job = await settlementQueue.add('settlement', { streamId: 'stream-123' });

        expect(job.id).toBeDefined();
        expect(job.correlationContext.correlation_id).toBe('corr-1');
        expect(job.correlationContext.stream_id).toBe('stream-123');
        expect(job.queueName).toBe('settlement-queue');
      });
    });

    it('should throw error when no correlation context available', async () => {
      await expect(
        settlementQueue.add('settlement', { streamId: 'stream-123' })
      ).rejects.toThrow('No correlation context available when enqueuing job');
    });

    it('should preserve correlation context in job metadata', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };

      await withCorrelationContext(context, async () => {
        const job = await settlementQueue.add('settlement', { streamId: 'stream-123' });

        expect(job.correlationContext.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
      });
    });

    it('should log job enqueue with correlation metadata', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
      };

      const consoleSpy = vi.spyOn(console, 'log');

      await withCorrelationContext(context, async () => {
        await settlementQueue.add('settlement', { streamId: 'stream-123' });
      });

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.message).toBe('Job enqueued');
      expect(logEntry.job_id).toBeDefined();
      expect(logEntry.queue_name).toBe('settlement-queue');
      expect(logEntry.correlation_id).toBe('corr-1');
      expect(logEntry.stream_id).toBe('stream-123');
    });
  });

  describe('Job retrieval', () => {
    it('should retrieve job by ID', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await withCorrelationContext(context, async () => {
        const job = await settlementQueue.add('settlement', { streamId: 'stream-123' });
        const retrieved = settlementQueue.getJob(job.id);

        expect(retrieved).toEqual(job);
      });
    });

    it('should return undefined for non-existent job', () => {
      const retrieved = settlementQueue.getJob('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all jobs', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await withCorrelationContext(context, async () => {
        await settlementQueue.add('settlement', { streamId: 'stream-1' });
        await settlementQueue.add('settlement', { streamId: 'stream-2' });

        const jobs = settlementQueue.getAllJobs();
        expect(jobs).toHaveLength(2);
      });
    });
  });

  describe('Queue clearing', () => {
    it('should clear all jobs', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      await withCorrelationContext(context, async () => {
        await settlementQueue.add('settlement', { streamId: 'stream-1' });
        await settlementQueue.add('settlement', { streamId: 'stream-2' });

        settlementQueue.clear();

        const jobs = settlementQueue.getAllJobs();
        expect(jobs).toHaveLength(0);
      });
    });
  });
});
