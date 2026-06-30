import { Job, MockQueue } from './queue';
import { withCorrelationContext, withJobContext, withRetryContext, logger, type CorrelationContext } from './logger';

/**
 * Mock worker that processes jobs with correlation context restoration
 */
export class MockWorker {
  private queue: MockQueue;
  private processor: (job: Job) => Promise<void>;

  constructor(queue: MockQueue, processor: (job: Job) => Promise<void>) {
    this.queue = queue;
    this.processor = processor;
  }

  /**
   * Process a single job with correlation context restoration
   */
  async processJob(jobId: string): Promise<void> {
    const job = this.queue.getJob(jobId);
    
    if (!job) {
      logger.error('Job not found', { job_id: jobId });
      throw new Error(`Job ${jobId} not found`);
    }

    // Restore correlation context from job metadata
    await withCorrelationContext(job.correlationContext, async () => {
      // Add job-specific context
      withJobContext(job.id, job.queueName);
      
      // Add retry context if this is a retry
      if (job.attempts > 0) {
        withRetryContext(job.attempts);
      }

      logger.info('Worker processing job', {
        job_id: job.id,
        queue_name: job.queueName,
        attempt: job.attempts + 1,
        correlation_id: job.correlationContext.correlation_id,
        stream_id: job.correlationContext.stream_id,
      });

      try {
        await this.processor(job);
        
        logger.info('Job processed successfully', {
          job_id: job.id,
          queue_name: job.queueName,
          correlation_id: job.correlationContext.correlation_id,
        });
      } catch (error) {
        job.attempts++;
        
        logger.error('Job processing failed', {
          job_id: job.id,
          queue_name: job.queueName,
          attempt: job.attempts,
          correlation_id: job.correlationContext.correlation_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (job.attempts >= job.maxAttempts) {
          logger.error('Job max retries exceeded', {
            job_id: job.id,
            queue_name: job.queueName,
            correlation_id: job.correlationContext.correlation_id,
            max_attempts: job.maxAttempts,
          });
          throw error;
        }

        // Retry logic would go here in a real system
        throw error;
      }
    });
  }

  /**
   * Process all jobs in the queue
   */
  async processAll(): Promise<void> {
    const jobs = this.queue.getAllJobs();
    
    logger.info('Worker starting batch processing', {
      queue_name: this.queue['queueName'],
      job_count: jobs.length,
    });

    for (const job of jobs) {
      try {
        await this.processJob(job.id);
      } catch (error) {
        // Continue processing other jobs even if one fails
        logger.error('Job failed in batch', {
          job_id: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Worker batch processing completed', {
      queue_name: this.queue['queueName'],
      job_count: jobs.length,
    });
  }
}
