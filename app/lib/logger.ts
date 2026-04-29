import { AsyncLocalStorage } from 'node:async_hooks';
import { isSecret, redactSecrets } from './config';

// Correlation context interface
export interface CorrelationContext {
  request_id: string;
  correlation_id: string;
  traceparent?: string;
  stream_id?: string;
  job_id?: string;
  stellar_tx_hash?: string;
  webhook_id?: string;
  retry_count?: number;
  queue_name?: string;
}

// AsyncLocalStorage for correlation context propagation
export const correlationContext = new AsyncLocalStorage<CorrelationContext>();

// Service name from environment or default
const SERVICE_NAME = process.env.SERVICE_NAME || 'streampay-frontend';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Generate a UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

// Parse W3C traceparent header
function parseTraceparent(traceparent: string | null): string | undefined {
  if (!traceparent) return undefined;
  // Validate traceparent format: 00-{trace-id}-{span-id}-{trace-flags}
  const parts = traceparent.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return undefined;
  }
  return traceparent;
}

// Extract correlation context from headers
export function extractCorrelationContext(headers: Headers): CorrelationContext {
  const requestId = headers.get('x-request-id') || headers.get('request-id') || generateUUID();
  const correlationId = headers.get('x-correlation-id') || headers.get('correlation-id') || requestId;
  const traceparent = parseTraceparent(headers.get('traceparent'));
  const streamId = headers.get('x-stream-id') || headers.get('stream-id') || undefined;
  const jobId = headers.get('x-job-id') || headers.get('job-id') || undefined;

  return {
    request_id: requestId,
    correlation_id: correlationId,
    traceparent,
    stream_id: streamId,
    job_id: jobId,
  };
}

// Get current correlation context
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationContext.getStore();
}

// Set correlation context for a async operation
export function withCorrelationContext<T>(
  context: CorrelationContext,
  callback: () => Promise<T>
): Promise<T> {
  return correlationContext.run(context, callback);
}

// Structured log entry interface
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  request_id?: string;
  correlation_id?: string;
  stream_id?: string;
  job_id?: string;
  stellar_tx_hash?: string;
  webhook_id?: string;
  retry_count?: number;
  queue_name?: string;
  traceparent?: string;
  [key: string]: unknown;
}

// Internal logger function
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta: Record<string, unknown> = {}) {
  const context = getCorrelationContext();
  
  // Redact secrets before logging
  const safeMeta = redactSecrets(meta);
  
  const logEntry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    ...safeMeta,
  };

  // Add correlation context if available
  if (context) {
    logEntry.request_id = context.request_id;
    logEntry.correlation_id = context.correlation_id;
    if (context.traceparent) logEntry.traceparent = context.traceparent;
    if (context.stream_id) logEntry.stream_id = context.stream_id;
    if (context.job_id) logEntry.job_id = context.job_id;
    if (context.stellar_tx_hash) logEntry.stellar_tx_hash = context.stellar_tx_hash;
    if (context.webhook_id) logEntry.webhook_id = context.webhook_id;
    if (context.retry_count !== undefined) logEntry.retry_count = context.retry_count;
    if (context.queue_name) logEntry.queue_name = context.queue_name;
  }

  // Output as JSON for structured logging
  console.log(JSON.stringify(logEntry));
}

// Logger interface
export const logger = {
  info: (message: string, meta: Record<string, unknown> = {}) => log('info', message, meta),
  warn: (message: string, meta: Record<string, unknown> = {}) => log('warn', message, meta),
  error: (message: string, meta: Record<string, unknown> = {}) => log('error', message, meta),
  debug: (message: string, meta: Record<string, unknown> = {}) => log('debug', message, meta),
};

// Update correlation context with additional fields
export function updateCorrelationContext(updates: Partial<CorrelationContext>): void {
  const context = getCorrelationContext();
  if (context) {
    Object.assign(context, updates);
  }
}

// Create a child correlation context (e.g., for async jobs)
export function createChildContext(parentContext: CorrelationContext, updates: Partial<CorrelationContext> = {}): CorrelationContext {
  return {
    ...parentContext,
    ...updates,
    request_id: generateUUID(), // New request_id for child operations
  };
}

// Context helpers (re-exported from correlation-middleware for convenience)
export { withStreamContext, withJobContext, withStellarContext, withWebhookContext, withRetryContext } from './correlation-middleware';
