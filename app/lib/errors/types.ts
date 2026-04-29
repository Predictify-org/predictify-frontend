/**
 * Unified Error Handling Types
 * 
 * Standardized error structure following RFC 7807 (Problem Details for HTTP APIs)
 * with StreamPay-specific extensions for Stellar/blockchain operations.
 */

/**
 * Standardized error codes used across all StreamPay services.
 * These are stable, versioned, and machine-readable.
 */
export type ErrorCode =
  // HTTP Standard Errors (4xx)
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'REQUEST_TIMEOUT'
  
  // HTTP Server Errors (5xx)
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  
  // Stellar/Blockchain Errors
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_SIGNATURE'
  | 'TRUSTLINE_MISSING'
  | 'TRANSACTION_FAILED'
  | 'TRANSACTION_TIMEOUT'
  | 'ACCOUNT_NOT_FOUND'
  | 'SEQUENCE_NUMBER_INVALID'
  
  // Stream Domain Errors
  | 'STREAM_NOT_FOUND'
  | 'INVALID_STREAM_STATE'
  | 'STREAM_CREATION_FAILED'
  | 'SETTLEMENT_FAILED'
  | 'WITHDRAWAL_FAILED'
  
  // Network Errors
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_UNAVAILABLE'
  | 'DNS_LOOKUP_FAILED'
  | 'CONNECTION_RESET'
  
  // Idempotency Errors
  | 'IDEMPOTENCY_KEY_REUSE'
  | 'IDEMPOTENCY_CONFLICT'
  
  // Validation Errors
  | 'VALIDATION_ERROR'
  | 'INVALID_REQUEST'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  
  // Catch-all
  | 'UNKNOWN_ERROR';

/**
 * Error categories for grouping and handling策略
 */
export type ErrorCategory =
  | 'client'      // 4xx errors - client-side issues
  | 'server'      // 5xx errors - server-side issues
  | 'network'     // Network connectivity issues
  | 'blockchain'  // Stellar/blockchain-specific errors
  | 'validation'  // Input validation errors
  | 'auth'        // Authentication/authorization errors
  | 'unknown';    // Uncategorized errors

/**
 * Retry guidance for error recovery
 */
export interface RetryGuidance {
  /** Whether this error is potentially retryable */
  retryable: boolean;
  /** Suggested delay before retry (in milliseconds) */
  suggestedDelayMs?: number;
  /** Maximum number of retry attempts recommended */
  maxRetries?: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff?: boolean;
}

/**
 * Standardized error structure (RFC 7807 compatible)
 * 
 * This is the normalized format used throughout the frontend.
 * Backend errors are mapped to this structure.
 */
export interface StreamPayError {
  /** RFC 7807 type URI or namespaced error identifier */
  type: string;
  
  /** Stable machine-readable error code (PRIMARY KEY) */
  code: ErrorCode;
  
  /** Short human-readable summary */
  title: string;
  
  /** Safe user-facing message (no internal details) */
  detail: string;
  
  /** HTTP status code */
  status: number;
  
  /** Request correlation ID for tracing */
  requestId?: string;
  
  /** Error category for grouping */
  category: ErrorCategory;
  
  /** Retry guidance for recovery */
  retry: RetryGuidance;
  
  /** Optional structured metadata (sanitized - no sensitive data) */
  meta?: {
    /** Field-level validation errors for forms */
    fieldErrors?: Record<string, string>;
    /** Additional context (safe only) */
    [key: string]: unknown;
  };
  
  /** 
   * Extended debug information (ONLY in development/debug mode)
   * NEVER exposed in production
   */
  debug?: {
    /** Original backend error code (if different) */
    originalCode?: string;
    /** Original error message from backend */
    originalMessage?: string;
    /** Raw backend response (sanitized) */
    rawResponse?: unknown;
    /** Stack trace (if available and safe) */
    stack?: string;
    /** Timestamp when error occurred */
    timestamp: string;
  };
}

/**
 * Backend API error response structure (from OpenAPI spec)
 */
export interface BackendApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id: string;
}

export interface BackendApiErrorResponse {
  error: BackendApiError;
}

/**
 * Stellar Horizon error types
 */
export interface HorizonError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  extras?: {
    envelope_xdr?: string;
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
    result_xdr?: string;
  };
}

/**
 * Error severity levels for UI handling
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * UI error presentation options
 */
export interface ErrorPresentation {
  /** How to display the error */
  type: 'toast' | 'banner' | 'modal' | 'inline' | 'silent';
  /** Error severity level */
  severity: ErrorSeverity;
  /** Whether error auto-dismisses */
  autoDismiss?: boolean;
  /** Auto-dismiss delay in milliseconds */
  autoDismissDelayMs?: number;
  /** Whether user can dismiss the error */
  dismissible?: boolean;
  /** Action button config (if applicable) */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Error handler callback type
 */
export type ErrorHandler = (error: StreamPayError) => void | Promise<void>;

/**
 * Error filter predicate
 */
export type ErrorFilter = (error: StreamPayError) => boolean;

/**
 * Options for error normalization
 */
export interface ErrorNormalizationOptions {
  /** Current environment */
  environment?: 'development' | 'production' | 'test';
  /** Whether to include debug information */
  includeDebug?: boolean;
  /** Whether user is authenticated (affects debug info availability) */
  isAuthenticated?: boolean;
  /** Request ID from correlation context */
  requestId?: string;
}
