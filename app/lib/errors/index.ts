/**
 * StreamPay Error Handling Module
 * 
 * Unified error handling system using application/problem+json (RFC 7807 style)
 * with stable, versioned internal error codes.
 * 
 * @module @/app/lib/errors
 */

// Types
export type {
  StreamPayError,
  ErrorCode,
  ErrorCategory,
  RetryGuidance,
  BackendApiError,
  BackendApiErrorResponse,
  HorizonError,
  ErrorSeverity,
  ErrorPresentation,
  ErrorHandler,
  ErrorFilter,
  ErrorNormalizationOptions,
} from './types';

// Error Codes and Registry
export {
  ERROR_REGISTRY,
  HORIZON_ERROR_MAPPING,
  BACKEND_ERROR_CODE_MAPPING,
  getErrorMetadata,
  isRetryableError,
  getRetryGuidance,
  getUserMessage,
  getErrorCodeForHttpStatus,
  type ErrorCodeMetadata,
} from './codes';

// Error Mapping and Normalization
export {
  normalizeError,
  normalizeBackendError,
  normalizeHorizonError,
  normalizeNetworkError,
  normalizeGenericError,
  createError,
  isStreamPayError,
  isBackendApiErrorResponse,
  isHorizonError,
  isNetworkError,
} from './mapper';

// Global Error Handler
export {
  GlobalErrorHandler,
  getGlobalErrorHandler,
  resetGlobalErrorHandler,
  handleError,
  handleApiCall,
  useErrorHandler,
  getFormErrors,
  hasFieldErrors,
  getFirstFieldError,
  formatErrorForDisplay,
  type ErrorEvent,
  type ErrorHandlerConfig,
} from './handler';
