/**
 * Error Mapping Layer
 * 
 * Converts raw API errors (backend, Stellar Horizon, network)
 * into standardized StreamPayError format.
 */

import type {
  StreamPayError,
  BackendApiErrorResponse,
  HorizonError,
  ErrorNormalizationOptions,
  ErrorCode,
} from './types';
import {
  ERROR_REGISTRY,
  HORIZON_ERROR_MAPPING,
  BACKEND_ERROR_CODE_MAPPING,
  getErrorCodeForHttpStatus,
  getErrorMetadata,
} from './codes';

/**
 * Detect if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

/**
 * Check if debug info should be included
 */
function shouldIncludeDebug(options: ErrorNormalizationOptions): boolean {
  // Check explicit environment option first, then fall back to process.env
  const env = options.environment || getEnvironment();
  
  // Never include debug in production
  if (env === 'production') {
    return false;
  }
  
  // Include if explicitly requested in dev/test
  return options.includeDebug ?? true;
}

/**
 * Sanitize error metadata to remove sensitive data
 */
function sanitizeMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  
  const sensitiveKeys = [
    'password', 'secret', 'token', 'key', 'auth', 'credential',
    'private', 'signature', 'seed', 'mnemonic', 'wallet',
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Extract field errors from backend validation response
 */
function extractFieldErrors(details: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!details) return undefined;
  
  // Handle standard validation error format
  if (details.fieldErrors && typeof details.fieldErrors === 'object') {
    return details.fieldErrors as Record<string, string>;
  }
  
  // Handle array of field errors
  if (details.errors && Array.isArray(details.errors)) {
    const fieldErrors: Record<string, string> = {};
    for (const err of details.errors) {
      if (err.field && err.message) {
        fieldErrors[err.field] = err.message;
      }
    }
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
  }
  
  return undefined;
}

/**
 * Map backend error code to frontend error code
 */
function mapBackendErrorCode(backendCode: string): ErrorCode {
  const mapped = BACKEND_ERROR_CODE_MAPPING[backendCode];
  if (mapped) return mapped;
  
  // Try case-insensitive match
  const upperCode = backendCode.toUpperCase();
  const caseInsensitiveMapped = BACKEND_ERROR_CODE_MAPPING[upperCode];
  if (caseInsensitiveMapped) return caseInsensitiveMapped;
  
  // Try to infer from code pattern
  if (backendCode.includes('NOT_FOUND') || backendCode.includes('NOTFOUND')) {
    return 'NOT_FOUND';
  }
  if (backendCode.includes('UNAUTHORIZED') || backendCode.includes('AUTH')) {
    return 'UNAUTHORIZED';
  }
  if (backendCode.includes('FORBIDDEN') || backendCode.includes('PERMISSION')) {
    return 'FORBIDDEN';
  }
  if (backendCode.includes('VALIDATION') || backendCode.includes('INVALID')) {
    return 'VALIDATION_ERROR';
  }
  if (backendCode.includes('TIMEOUT')) {
    return 'REQUEST_TIMEOUT';
  }
  if (backendCode.includes('RATE') || backendCode.includes('LIMIT')) {
    return 'RATE_LIMITED';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Map Horizon/Stellar error to frontend error code
 */
function mapHorizonError(horizonError: HorizonError): ErrorCode {
  // Check operation result codes first
  if (horizonError.extras?.result_codes?.operations) {
    for (const opCode of horizonError.extras.result_codes.operations) {
      const mapped = HORIZON_ERROR_MAPPING[opCode];
      if (mapped) return mapped;
    }
  }
  
  // Check transaction result code
  if (horizonError.extras?.result_codes?.transaction) {
    const txCode = horizonError.extras.result_codes.transaction;
    const mapped = HORIZON_ERROR_MAPPING[txCode];
    if (mapped) return mapped;
  }
  
  // Check error type
  if (horizonError.type) {
    const mapped = HORIZON_ERROR_MAPPING[horizonError.type];
    if (mapped) return mapped;
  }
  
  // Fallback to status code mapping
  return getErrorCodeForHttpStatus(horizonError.status);
}

/**
 * Normalize a backend API error response
 */
export function normalizeBackendError(
  response: BackendApiErrorResponse,
  httpStatus: number,
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  const backendError = response.error;
  const errorCode = mapBackendErrorCode(backendError.code);
  const metadata = getErrorMetadata(errorCode);
  
  const includeDebug = shouldIncludeDebug(options);
  
  // In production, always use safe user message from registry
  // In dev/test, can use backend message for debugging
  const detail = includeDebug 
    ? (backendError.message || metadata.userMessage)
    : metadata.userMessage;
  
  const normalized: StreamPayError = {
    type: metadata.typeUri,
    code: errorCode,
    title: metadata.title,
    detail,
    status: httpStatus,
    requestId: backendError.request_id || options.requestId,
    category: metadata.category,
    retry: metadata.retry,
    meta: {
      ...sanitizeMetadata(backendError.details),
      fieldErrors: extractFieldErrors(backendError.details),
    },
  };
  
  // Include debug info only in dev/test
  if (includeDebug) {
    normalized.debug = {
      originalCode: backendError.code,
      originalMessage: backendError.message,
      rawResponse: response,
      timestamp: new Date().toISOString(),
    };
  }
  
  return normalized;
}

/**
 * Normalize a Stellar Horizon error
 */
export function normalizeHorizonError(
  horizonError: HorizonError,
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  const errorCode = mapHorizonError(horizonError);
  const metadata = getErrorMetadata(errorCode);
  const includeDebug = shouldIncludeDebug(options);
  
  // In production, always use safe user message from registry
  // In dev/test, can use horizon detail for debugging
  const detail = includeDebug
    ? (horizonError.detail || metadata.userMessage)
    : metadata.userMessage;
  
  const normalized: StreamPayError = {
    type: metadata.typeUri,
    code: errorCode,
    title: horizonError.title || metadata.title,
    detail,
    status: horizonError.status || 400,
    requestId: options.requestId,
    category: 'blockchain',
    retry: metadata.retry,
  };
  
  if (includeDebug) {
    normalized.debug = {
      originalCode: horizonError.type,
      originalMessage: horizonError.detail,
      rawResponse: horizonError,
      timestamp: new Date().toISOString(),
    };
  }
  
  return normalized;
}

/**
 * Normalize a network error
 */
export function normalizeNetworkError(
  error: Error,
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  const message = error.message.toLowerCase();
  let errorCode: ErrorCode = 'NETWORK_UNAVAILABLE';
  
  // Determine specific network error type
  if (message.includes('timeout') || message.includes('etimedout')) {
    errorCode = 'NETWORK_TIMEOUT';
  } else if (message.includes('dns') || message.includes('enotfound') || message.includes('eai_again')) {
    errorCode = 'DNS_LOOKUP_FAILED';
  } else if (message.includes('reset') || message.includes('econnreset')) {
    errorCode = 'CONNECTION_RESET';
  } else if (message.includes('offline') || message.includes('network') || message.includes('fetch')) {
    errorCode = 'NETWORK_UNAVAILABLE';
  }
  
  const metadata = getErrorMetadata(errorCode);
  const includeDebug = shouldIncludeDebug(options);
  
  const normalized: StreamPayError = {
    type: metadata.typeUri,
    code: errorCode,
    title: metadata.title,
    detail: metadata.userMessage,
    status: 0, // Network errors don't have HTTP status
    requestId: options.requestId,
    category: 'network',
    retry: metadata.retry,
  };
  
  if (includeDebug) {
    normalized.debug = {
      originalMessage: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }
  
  return normalized;
}

/**
 * Normalize a generic JavaScript error
 */
export function normalizeGenericError(
  error: Error,
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  const metadata = getErrorMetadata('UNKNOWN_ERROR');
  const includeDebug = shouldIncludeDebug(options);
  
  const normalized: StreamPayError = {
    type: metadata.typeUri,
    code: 'UNKNOWN_ERROR',
    title: metadata.title,
    detail: metadata.userMessage,
    status: 500,
    requestId: options.requestId,
    category: 'unknown',
    retry: metadata.retry,
  };
  
  if (includeDebug) {
    normalized.debug = {
      originalMessage: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }
  
  return normalized;
}

/**
 * Main error normalization function
 * Handles any error type and converts to StreamPayError
 */
export function normalizeError(
  error: unknown,
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  // Already normalized
  if (isStreamPayError(error)) {
    return error;
  }
  
  // Handle Response objects (from fetch)
  if (error instanceof Response) {
    // Try to parse as backend error
    // Note: This is async, caller should handle it
    throw new Error('Response objects must be parsed before normalization');
  }
  
  // Handle backend API error response
  if (isBackendApiErrorResponse(error)) {
    return normalizeBackendError(error, 500, options);
  }
  
  // Handle Horizon errors
  if (isHorizonError(error)) {
    return normalizeHorizonError(error, options);
  }
  
  // Handle network errors (TypeError from fetch)
  if (isNetworkError(error)) {
    return normalizeNetworkError(error as Error, options);
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    // Check if it looks like a network error
    if (isNetworkErrorMessage(error.message)) {
      return normalizeNetworkError(error, options);
    }
    return normalizeGenericError(error, options);
  }
  
  // Handle plain objects with error properties
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    
    // Check for backend error structure
    if (errObj.error && typeof errObj.error === 'object') {
      const errorData = errObj.error as Record<string, unknown>;
      if (errorData.code && errorData.message && errorData.request_id) {
        return normalizeBackendError(
          { error: errorData as { code: string; message: string; request_id: string } },
          typeof errObj.status === 'number' ? errObj.status : 500,
          options
        );
      }
    }
    
    // Check for Horizon-like structure
    if (errObj.type && errObj.title) {
      return normalizeHorizonError(errObj as unknown as HorizonError, options);
    }
  }
  
  // Unknown error type - create generic error
  const metadata = getErrorMetadata('UNKNOWN_ERROR');
  return {
    type: metadata.typeUri,
    code: 'UNKNOWN_ERROR',
    title: metadata.title,
    detail: metadata.userMessage,
    status: 500,
    requestId: options.requestId,
    category: 'unknown',
    retry: metadata.retry,
    meta: {
      originalError: typeof error === 'string' ? error : JSON.stringify(error),
    },
  };
}

/**
 * Type guard: Check if error is already a StreamPayError
 */
export function isStreamPayError(error: unknown): error is StreamPayError {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    typeof e.code === 'string' &&
    typeof e.title === 'string' &&
    typeof e.detail === 'string' &&
    typeof e.status === 'number' &&
    typeof e.category === 'string'
  );
}

/**
 * Type guard: Check if error is a backend API error response
 */
export function isBackendApiErrorResponse(error: unknown): error is BackendApiErrorResponse {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  if (!e.error || typeof e.error !== 'object') return false;
  const err = e.error as Record<string, unknown>;
  return (
    typeof err.code === 'string' &&
    typeof err.message === 'string' &&
    typeof err.request_id === 'string'
  );
}

/**
 * Type guard: Check if error is a Horizon error
 */
export function isHorizonError(error: unknown): error is HorizonError {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    typeof e.title === 'string' &&
    typeof e.status === 'number'
  );
}

/**
 * Check if error message indicates a network error
 */
function isNetworkErrorMessage(message: string): boolean {
  const networkKeywords = [
    'network', 'fetch', 'timeout', 'offline', 'internet',
    'connection', 'dns', 'econn', 'etimedout', 'enotfound',
    'eai_again', 'aborted', 'failed to fetch',
  ];
  const lowerMessage = message.toLowerCase();
  return networkKeywords.some(kw => lowerMessage.includes(kw));
}

/**
 * Type guard: Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  // TypeError from fetch typically indicates network issues
  if (error.name === 'TypeError') return true;
  
  return isNetworkErrorMessage(error.message);
}

/**
 * Create a StreamPayError from scratch
 */
export function createError(
  code: ErrorCode,
  overrides: Partial<StreamPayError> = {},
  options: ErrorNormalizationOptions = {}
): StreamPayError {
  const metadata = getErrorMetadata(code);
  
  return {
    type: metadata.typeUri,
    code,
    title: metadata.title,
    detail: metadata.userMessage,
    status: metadata.httpStatus,
    requestId: options.requestId,
    category: metadata.category,
    retry: metadata.retry,
    ...overrides,
  };
}
