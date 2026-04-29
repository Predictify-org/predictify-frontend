import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { MockWorker } from './worker';
import { MockQueue } from './queue';
import { withCorrelationContext, logger, type CorrelationContext } from './logger';

describe('Mock Worker System', () => {
  let queue: MockQueue;
  let worker: MockWorker;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    queue = new MockQueue('test-queue');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Job processing with correlation restoration', () => {
    it('should restore correlation context from job metadata', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
      };

      const processor = vi.fn().mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        await worker.processJob(job.id);
      });

      expect(processor).toHaveBeenCalled();
    });

    it('should add job context during processing', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        await worker.processJob(job.id);
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const processingLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Worker processing job';
      });

      expect(processingLog).toBeDefined();
      const logEntry = JSON.parse(processingLog![0]);
      expect(logEntry.job_id).toBeDefined();
      expect(logEntry.queue_name).toBe('test-queue');
    });

    it('should add retry context for retry attempts', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockRejectedValue(new Error('Test error'));
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        job.attempts = 2; // Simulate retry
        await worker.processJob(job.id).catch(() => {});
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const processingLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Worker processing job';
      });

      expect(processingLog).toBeDefined();
      const logEntry = JSON.parse(processingLog![0]);
      expect(logEntry.attempt).toBe(3); // attempts + 1
    });

    it('should log successful job processing', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
        stream_id: 'stream-123',
      };

      const processor = vi.fn().mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        await worker.processJob(job.id);
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const successLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Job processed successfully';
      });

      expect(successLog).toBeDefined();
      const logEntry = JSON.parse(successLog![0]);
      expect(logEntry.correlation_id).toBe('corr-1');
      expect(logEntry.stream_id).toBe('stream-123');
    });

    it('should log failed job processing with error', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockRejectedValue(new Error('Test error'));
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        await worker.processJob(job.id).catch(() => {});
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const errorLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Job processing failed';
      });

      expect(errorLog).toBeDefined();
      const logEntry = JSON.parse(errorLog![0]);
      expect(logEntry.level).toBe('error');
      expect(logEntry.error).toBe('Test error');
      expect(logEntry.correlation_id).toBe('corr-1');
    });

    it('should log max retries exceeded', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockRejectedValue(new Error('Test error'));
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        const job = await queue.add('test-job', { data: 'test' });
        job.attempts = 3; // At max attempts
        await worker.processJob(job.id).catch(() => {});
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const maxRetriesLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Job max retries exceeded';
      });

      expect(maxRetriesLog).toBeDefined();
      const logEntry = JSON.parse(maxRetriesLog![0]);
      expect(logEntry.max_attempts).toBe(3);
    });
  });

  describe('Batch processing', () => {
    it('should process all jobs in queue', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        await queue.add('test-job', { data: 'test1' });
        await queue.add('test-job', { data: 'test2' });
        await queue.add('test-job', { data: 'test3' });

        await worker.processAll();
      });

      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should log batch processing start and end', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn().mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        await queue.add('test-job', { data: 'test' });
        await worker.processAll();
      });

      const consoleSpy = vi.spyOn(console, 'log');
      const logCalls = consoleSpy.mock.calls;
      
      const startLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Worker starting batch processing';
      });

      const endLog = logCalls.find((call: unknown[]) => {
        const entry = JSON.parse(call[0] as string);
        return entry.message === 'Worker batch processing completed';
      });

      expect(startLog).toBeDefined();
      expect(endLog).toBeDefined();
    });

    it('should continue processing after job failure', async () => {
      const context: CorrelationContext = {
        request_id: 'req-1',
        correlation_id: 'corr-1',
      };

      const processor = vi.fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValue(undefined);
      worker = new MockWorker(queue, processor);

      await withCorrelationContext(context, async () => {
        await queue.add('test-job', { data: 'test1' });
        await queue.add('test-job', { data: 'test2' });

        await worker.processAll();
      });

      expect(processor).toHaveBeenCalledTimes(2);
    });
  });
});
