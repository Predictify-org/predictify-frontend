import { Job, MockQueue } from './queue';
import { withCorrelationContext, withJobContext, withRetryContext, logger, type CorrelationContext } from './logger';
import { webhookDeliveryStore } from './webhook-delivery-store';
import { WebhookDeliveryAttempt } from './webhook-delivery';
import { recordQueueRetry, recordQueueFailure, recordQueueDLQWrite } from './rate-limit-metrics';

export function isTerminalError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    if ((error as any).isTerminal || (error as any).terminal) return true;
    const msg = error.message.toLowerCase();
    if (
      msg.includes('terminal') ||
      msg.includes('validation') ||
      msg.includes('invalid') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('not found')
    ) {
      return true;
    }
  }
  if (typeof error === 'object') {
    if ((error as any).isTerminal || (error as any).terminal) return true;
    const status = (error as any).status || (error as any).statusCode;
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }
  }
  return false;
}

export function getBackoffDelay(attempts: number): number {
  const delays = [1000, 5000, 30000, 300000];
  if (attempts >= 1 && attempts <= 4) {
    return delays[attempts - 1];
  }
  return 0;
}

/**
 * Mock worker that processes jobs with correlation context restoration
 */
export class MockWorker {
  private queue: MockQueue;
  private processor: (job: Job) => Promise<void>;
  private delayFn: (ms: number) => Promise<void>;

  constructor(
    queue: MockQueue,
    processor: (job: Job) => Promise<void>,
    delayFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
  ) {
    this.queue = queue;
    this.processor = processor;
    this.delayFn = delayFn;
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
      
      if (job.queueName === 'retry-queue') {
        let lastError: any = null;
        while (job.attempts < job.maxAttempts) {
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
            return;
          } catch (error: any) {
            job.attempts++;
            lastError = error;

            logger.error('Job processing failed', {
              job_id: job.id,
              queue_name: job.queueName,
              attempt: job.attempts,
              correlation_id: job.correlationContext.correlation_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            if (isTerminalError(error)) {
              logger.error('Terminal error encountered — stopping retries', {
                job_id: job.id,
                queue_name: job.queueName,
                correlation_id: job.correlationContext.correlation_id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              recordQueueFailure(job.queueName);
              this.writeToDLQ(job, `Terminal error on attempt ${job.attempts}: ${error.message || error}`);
              recordQueueDLQWrite(job.queueName);
              throw error;
            }

            if (job.attempts >= job.maxAttempts) {
              logger.error('Job max retries exceeded', {
                job_id: job.id,
                queue_name: job.queueName,
                correlation_id: job.correlationContext.correlation_id,
                max_attempts: job.maxAttempts,
              });

              recordQueueFailure(job.queueName);
              this.writeToDLQ(job, `Max attempts (${job.maxAttempts}) exhausted: ${error.message || error}`);
              recordQueueDLQWrite(job.queueName);
              throw error;
            }

            const delayMs = getBackoffDelay(job.attempts);
            logger.info('Job retry scheduled', {
              job_id: job.id,
              attempt: job.attempts,
              next_attempt: job.attempts + 1,
              delay_ms: delayMs,
              correlation_id: job.correlationContext.correlation_id,
            });

            recordQueueRetry(job.queueName, job.attempts);
            await this.delayFn(delayMs);
          }
        }
        if (lastError) {
          throw lastError;
        }
      } else {
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
            recordQueueFailure(job.queueName);
            throw error;
          }

          throw error;
        }
      }
    });
  }

  private writeToDLQ(job: Job, reason: string): void {
    const endpoint = {
      id: 'soroban-retry-queue',
      url: 'soroban-retry-queue',
      maxRetries: job.maxAttempts,
    };
    const event = {
      id: `event-${job.id}`,
      eventType: 'soroban.submission',
      streamId: job.correlationContext.stream_id || '',
      data: job.data as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    };
    webhookDeliveryStore.createDelivery(job.id, endpoint, event);
    
    const attempt: WebhookDeliveryAttempt = {
      attemptNumber: job.attempts,
      timestamp: new Date().toISOString(),
      error: reason,
      retryable: false,
    };
    webhookDeliveryStore.recordAttempt(job.id, attempt);
    webhookDeliveryStore.moveToDLQ(job.id, reason);
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
