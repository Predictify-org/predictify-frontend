import { NextRequest, NextResponse } from 'next/server';
import { extractCorrelationContext, withCorrelationContext, logger, updateCorrelationContext } from '@/app/lib/logger';

// Internal headers that should not be exposed to external clients
const INTERNAL_HEADERS = [
  'x-internal-auth',
  'x-service-token',
  'x-correlation-id-internal',
];

// Trusted internal services that can set correlation headers
// In production, this should be validated via auth tokens or network allowlists
const TRUSTED_INTERNAL_SERVICES = new Set([
  'localhost',
  '127.0.0.1',
  // Add internal service hostnames here
]);

/**
 * Middleware to extract and set correlation context from request headers
 * This should be called at the beginning of each API route handler
 */
export async function withCorrelationMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const headers = request.headers;
  
  // Extract correlation context from headers
  const context = extractCorrelationContext(headers);
  
  // Log incoming request
  logger.info('Incoming request', {
    method: request.method,
    url: request.url,
    user_agent: headers.get('user-agent'),
  });
  
  // Execute handler with correlation context
  return withCorrelationContext(context, async () => {
    const response = await handler();
    
    // Strip internal headers from response
    const responseHeaders = new Headers(response.headers);
    INTERNAL_HEADERS.forEach(header => {
      responseHeaders.delete(header);
    });
    
    // Add correlation headers to response for internal tracing
    responseHeaders.set('x-request-id', context.request_id);
    responseHeaders.set('x-correlation-id', context.correlation_id);
    if (context.traceparent) {
      responseHeaders.set('traceparent', context.traceparent);
    }
    
    // Log response
    logger.info('Request completed', {
      status: response.status,
      method: request.method,
      url: request.url,
    });
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  });
}

/**
 * Security check to prevent header spoofing from external clients
 * External clients should not be able to override internal correlation IDs
 */
export function isTrustedInternalRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const forwardedFor = request.headers.get('x-forwarded-for');
  
  // Check if request is from trusted internal service
  if (host && TRUSTED_INTERNAL_SERVICES.has(host)) {
    return true;
  }
  
  // In production, validate via auth token or service mesh identity
  const internalAuthToken = request.headers.get('x-internal-auth');
  const config = (global as any).streampayConfig;
  if (internalAuthToken && config && internalAuthToken === config.internalAuthToken) {
    return true;
  }
  
  return false;
}

/**
 * Sanitize headers to prevent spoofing
 * For external requests, generate new correlation IDs instead of trusting client-provided ones
 */
export function sanitizeCorrelationHeaders(
  request: NextRequest,
  isTrusted: boolean
): { requestId: string; correlationId: string; traceparent?: string } {
  if (isTrusted) {
    // Trusted internal services can set correlation headers
    return {
      requestId: request.headers.get('x-request-id') || request.headers.get('request-id') || crypto.randomUUID(),
      correlationId: request.headers.get('x-correlation-id') || request.headers.get('correlation-id') || crypto.randomUUID(),
      traceparent: request.headers.get('traceparent') || undefined,
    };
  } else {
    // External clients get fresh correlation IDs to prevent spoofing
    return {
      requestId: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
      traceparent: undefined, // Don't trust external traceparent
    };
  }
}

/**
 * Helper to add stream-specific context to correlation
 */
export function withStreamContext(streamId: string) {
  updateCorrelationContext({ stream_id: streamId });
}

/**
 * Helper to add job-specific context to correlation
 */
export function withJobContext(jobId: string, queueName?: string) {
  updateCorrelationContext({ job_id: jobId, queue_name: queueName });
}

/**
 * Helper to add Stellar transaction context
 */
export function withStellarContext(txHash: string) {
  updateCorrelationContext({ stellar_tx_hash: txHash });
}

/**
 * Helper to add webhook context
 */
export function withWebhookContext(webhookId: string) {
  updateCorrelationContext({ webhook_id: webhookId });
}

/**
 * Helper to add retry context
 */
export function withRetryContext(retryCount: number) {
  updateCorrelationContext({ retry_count: retryCount });
}
