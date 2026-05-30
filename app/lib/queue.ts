import { CorrelationContext, withCorrelationContext, getCorrelationContext, logger } from './logger';

// Mock job interface
export interface Job<T = unknown> {
  id: string;
  data: T;
  correlationContext: CorrelationContext;
  queueName: string;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
}

// Mock queue for demonstration
export class MockQueue {
  private jobs: Map<string, Job> = new Map();
  private queueName: string;

  constructor(queueName: string) {
    this.queueName = queueName;
  }

  /**
   * Add a job to the queue with correlation context
   */
  async add<T>(jobName: string, data: T, options: { jobId?: string } = {}): Promise<Job<T>> {
    const context = getCorrelationContext();
    
    if (!context) {
      throw new Error('No correlation context available when enqueuing job');
    }

    const jobId = options.jobId || `job-${crypto.randomUUID()}`;
    
    const job: Job<T> = {
      id: jobId,
      data,
      correlationContext: { ...context }, // Copy context to preserve it
      queueName: this.queueName,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    this.jobs.set(jobId, job);

    logger.info('Job enqueued', {
      job_id: jobId,
      queue_name: this.queueName,
      job_name: jobName,
      correlation_id: context.correlation_id,
      stream_id: context.stream_id,
    });

    return job;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs in the queue
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.jobs.clear();
  }
}

// Mock queue instances
export const settlementQueue = new MockQueue('settlement-queue');
export const webhookQueue = new MockQueue('webhook-queue');
export const retryQueue = new MockQueue('retry-queue');
