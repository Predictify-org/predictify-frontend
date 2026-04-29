import type { StreamPayError, ErrorNormalizationOptions } from '@/app/lib/errors/types';
import { normalizeError, isNetworkError, createError } from '@/app/lib/errors/mapper';
import { getUserMessage } from '@/app/lib/errors/codes';

// Request ID header for correlation
const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Options for API client requests
 */
export interface ApiClientOptions {
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retry attempts for retryable errors */
  retries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff?: boolean;
  /** Custom error normalization options */
  errorOptions?: ErrorNormalizationOptions;
}

/**
 * Default API client options
 */
const DEFAULT_OPTIONS: Required<ApiClientOptions> = {
  timeoutMs: 30000,
  retries: 0,
  retryDelayMs: 1000,
  useExponentialBackoff: true,
  errorOptions: {
    environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
    includeDebug: process.env.NODE_ENV !== 'production',
  },
};

/**
 * Get request ID from response headers
 */
function getRequestId(response: Response): string | undefined {
  return response.headers.get(REQUEST_ID_HEADER) || undefined;
}

/**
 * Parse error response body safely
 */
async function parseErrorResponse(response: Response): Promise<unknown> {
  try {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Try to parse as text for non-JSON errors
    const text = await response.text();
    return { message: text };
  } catch {
    // If parsing fails, return status text
    return { message: response.statusText };
  }
}

/**
 * Create a StreamPayError from an HTTP response
 */
async function createErrorFromResponse(
  response: Response,
  errorBody: unknown,
  options: ErrorNormalizationOptions
): Promise<StreamPayError> {
  const requestId = getRequestId(response);
  
  // If error body has our expected structure
  if (errorBody && typeof errorBody === 'object') {
    const errObj = errorBody as Record<string, unknown>;
    
    // Check for nested error structure
    if (errObj.error && typeof errObj.error === 'object') {
      const nestedError = errObj.error as Record<string, unknown>;
      if (nestedError.code && nestedError.message && nestedError.request_id) {
        return normalizeError(
          {
            error: {
              code: nestedError.code as string,
              message: nestedError.message as string,
              request_id: nestedError.request_id as string,
              details: nestedError.details as Record<string, unknown> | undefined,
            },
          },
          { ...options, requestId: requestId || (nestedError.request_id as string) }
        );
      }
    }
    
    // Handle plain error objects
    if (errObj.code && errObj.message) {
      return normalizeError(
        {
          error: {
            code: errObj.code as string,
            message: errObj.message as string,
            request_id: (errObj.request_id as string) || requestId || 'unknown',
            details: errObj.details as Record<string, unknown> | undefined,
          },
        },
        { ...options, requestId }
      );
    }
    
    // Handle error message string
    if (errObj.message && typeof errObj.message === 'string') {
      return createErrorFromStatus(response.status, errObj.message, requestId, options);
    }
  }
  
  // Fallback to status-based error
  return createErrorFromStatus(response.status, response.statusText, requestId, options);
}

/**
 * Create error from HTTP status code
 */
function createErrorFromStatus(
  status: number,
  message: string,
  requestId: string | undefined,
  options: ErrorNormalizationOptions
): StreamPayError {
  // Map status to error code
  let code: StreamPayError['code'];
  switch (status) {
    case 400: code = 'BAD_REQUEST'; break;
    case 401: code = 'UNAUTHORIZED'; break;
    case 403: code = 'FORBIDDEN'; break;
    case 404: code = 'NOT_FOUND'; break;
    case 408: code = 'REQUEST_TIMEOUT'; break;
    case 409: code = 'CONFLICT'; break;
    case 422: code = 'UNPROCESSABLE_ENTITY'; break;
    case 429: code = 'RATE_LIMITED'; break;
    case 500: code = 'INTERNAL_ERROR'; break;
    case 503: code = 'SERVICE_UNAVAILABLE'; break;
    case 504: code = 'GATEWAY_TIMEOUT'; break;
    default: code = 'UNKNOWN_ERROR';
  }
  
  return normalizeError(
    {
      error: {
        code,
        message: message || getUserMessage(code),
        request_id: requestId || 'unknown',
      },
    },
    { ...options, requestId }
  );
}

/**
 * Execute fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Delay utility for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  useExponentialBackoff: boolean
): number {
  if (!useExponentialBackoff) return baseDelay;
  
  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30s
}

/**
 * Enhanced fetch with idempotency, error normalization, and retry logic
 */
export async function fetchWithIdempotency<T = unknown>(
  url: string,
  options: RequestInit = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...clientOptions };
  const method = options.method?.toUpperCase() || 'GET';
  const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  // Setup headers
  const headers = new Headers(options.headers || {});
  
  // Add idempotency key for mutating requests
  if (isMutatingRequest && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }
  
  // Add Accept header for JSON
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  let lastError: StreamPayError | undefined;
  
  // Retry loop
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      // Execute request with timeout
      const response = await fetchWithTimeout(
        url,
        { ...options, headers },
        opts.timeoutMs
      );
      
      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }
      
      // Check for error responses
      if (!response.ok) {
        const errorBody = await parseErrorResponse(response);
        const error = await createErrorFromResponse(response, errorBody, opts.errorOptions);
        
        // Check if error is retryable
        if (error.retry.retryable && attempt < opts.retries) {
          lastError = error;
          const retryDelay = calculateRetryDelay(
            attempt,
            opts.retryDelayMs,
            opts.useExponentialBackoff
          );
          await delay(retryDelay);
          continue;
        }
        
        throw error;
      }
      
      // Parse successful response
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json() as T;
      }
      
      return null as T;
      
    } catch (error) {
      // Handle network errors
      if (isNetworkError(error)) {
        const normalizedError = normalizeError(error, opts.errorOptions);
        
        // Check if network error is retryable
        if (normalizedError.retry.retryable && attempt < opts.retries) {
          lastError = normalizedError;
          const retryDelay = calculateRetryDelay(
            attempt,
            opts.retryDelayMs,
            opts.useExponentialBackoff
          );
          await delay(retryDelay);
          continue;
        }
        
        throw normalizedError;
      }
      
      // Re-throw if already a StreamPayError
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      
      // Handle unknown errors
      throw normalizeError(error, opts.errorOptions);
    }
  }
  
  // If we exhausted retries, throw the last error
  if (lastError) {
    throw lastError;
  }
  
  // Should not reach here, but just in case
  throw createError('UNKNOWN_ERROR');
}

/**
 * Simple GET request helper
 */
export async function get<T = unknown>(
  url: string,
  options: Omit<RequestInit, 'method'> = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  return fetchWithIdempotency<T>(url, { ...options, method: 'GET' }, clientOptions);
}

/**
 * Simple POST request helper
 */
export async function post<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<RequestInit, 'method' | 'body'> = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithIdempotency<T>(
    url,
    {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    },
    clientOptions
  );
}

/**
 * Simple PUT request helper
 */
export async function put<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<RequestInit, 'method' | 'body'> = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithIdempotency<T>(
    url,
    {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    },
    clientOptions
  );
}

/**
 * Simple PATCH request helper
 */
export async function patch<T = unknown>(
  url: string,
  body: unknown,
  options: Omit<RequestInit, 'method' | 'body'> = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithIdempotency<T>(
    url,
    {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    },
    clientOptions
  );
}

/**
 * Simple DELETE request helper
 */
export async function del<T = unknown>(
  url: string,
  options: Omit<RequestInit, 'method'> = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  return fetchWithIdempotency<T>(url, { ...options, method: 'DELETE' }, clientOptions);
}

// Re-export types for convenience
export type { StreamPayError, ApiClientOptions };
export { isNetworkError };
