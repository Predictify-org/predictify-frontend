/**
 * Global Error Handler
 * 
 * Centralizes error handling for:
 * - API calls
 * - React components
 * - Form submissions
 * - Event handlers
 * 
 * Provides consistent UI output and error tracking.
 */

import type {
  StreamPayError,
  ErrorHandler,
  ErrorFilter,
  ErrorPresentation,
  ErrorSeverity,
} from './types';
import { isRetryableError, getRetryGuidance, getUserMessage } from './codes';
import { normalizeError, isStreamPayError } from './mapper';

/**
 * Error event types for UI handling
 */
export interface ErrorEvent {
  error: StreamPayError;
  timestamp: number;
  context?: string;
  handled: boolean;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Default presentation settings */
  defaultPresentation: ErrorPresentation;
  /** Global error callback (for analytics/logging) */
  onError?: (event: ErrorEvent) => void;
  /** Filter to determine which errors to handle */
  filter?: ErrorFilter;
  /** Maximum number of concurrent errors to display */
  maxConcurrentErrors?: number;
  /** Whether to deduplicate similar errors */
  deduplicateErrors?: boolean;
  /** Deduplication window in milliseconds */
  deduplicationWindowMs?: number;
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  defaultPresentation: {
    type: 'toast',
    severity: 'error',
    autoDismiss: true,
    autoDismissDelayMs: 5000,
    dismissible: true,
  },
  maxConcurrentErrors: 3,
  deduplicateErrors: true,
  deduplicationWindowMs: 5000,
};

/**
 * Error deduplication cache
 */
const recentErrors = new Map<string, number>();

/**
 * Generate error signature for deduplication
 */
function getErrorSignature(error: StreamPayError): string {
  return `${error.code}:${error.status}:${error.detail.slice(0, 50)}`;
}

/**
 * Check if error is a duplicate (recently shown)
 */
function isDuplicateError(error: StreamPayError, windowMs: number): boolean {
  if (!windowMs) return false;
  
  const signature = getErrorSignature(error);
  const lastSeen = recentErrors.get(signature);
  const now = Date.now();
  
  if (lastSeen && (now - lastSeen) < windowMs) {
    return true;
  }
  
  // Update cache
  recentErrors.set(signature, now);
  
  // Cleanup old entries
  for (const [key, timestamp] of recentErrors.entries()) {
    if ((now - timestamp) > windowMs * 2) {
      recentErrors.delete(key);
    }
  }
  
  return false;
}

/**
 * Determine error severity based on error code and context
 */
function determineSeverity(error: StreamPayError): ErrorSeverity {
  // Critical errors
  if (error.code === 'INTERNAL_ERROR' || error.code === 'UNKNOWN_ERROR') {
    return 'critical';
  }
  
  // Auth errors
  if (error.category === 'auth') {
    return 'warning';
  }
  
  // Server errors
  if (error.category === 'server') {
    return 'error';
  }
  
  // Validation errors
  if (error.category === 'validation') {
    return 'warning';
  }
  
  // Network errors
  if (error.category === 'network') {
    return error.retry.retryable ? 'warning' : 'error';
  }
  
  // Blockchain errors
  if (error.category === 'blockchain') {
    return 'error';
  }
  
  return 'error';
}

/**
 * Determine presentation type based on error context
 */
function determinePresentation(
  error: StreamPayError,
  context?: string
): ErrorPresentation['type'] {
  // Form validation errors should be inline
  if (error.meta?.fieldErrors && Object.keys(error.meta.fieldErrors).length > 0) {
    return 'inline';
  }
  
  // Auth errors in certain contexts should use modal
  if (error.category === 'auth' && context === 'page') {
    return 'modal';
  }
  
  // Critical errors should use banner
  if (determineSeverity(error) === 'critical') {
    return 'banner';
  }
  
  // Default to toast
  return 'toast';
}

/**
 * Global error handler class
 */
export class GlobalErrorHandler {
  private config: ErrorHandlerConfig;
  private handlers: Set<ErrorHandler> = new Set();
  private activeErrors: ErrorEvent[] = [];
  private errorIdCounter = 0;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register an error handler
   */
  registerHandler(handler: ErrorHandler): () => void {
    this.handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Handle an error
   */
  handleError(
    error: unknown,
    context?: string,
    presentationOverrides?: Partial<ErrorPresentation>
  ): StreamPayError {
    // Normalize error
    const normalizedError = isStreamPayError(error)
      ? error
      : normalizeError(error);

    // Check filter
    if (this.config.filter && !this.config.filter(normalizedError)) {
      return normalizedError;
    }

    // Check deduplication
    if (
      this.config.deduplicateErrors &&
      isDuplicateError(normalizedError, this.config.deduplicationWindowMs || 0)
    ) {
      return normalizedError;
    }

    // Check max concurrent errors
    if (this.activeErrors.length >= (this.config.maxConcurrentErrors || 3)) {
      // Remove oldest error
      const removed = this.activeErrors.shift();
      if (removed) {
        this.notifyHandlers({ ...removed, handled: false });
      }
    }

    // Create error event
    const errorId = ++this.errorIdCounter;
    const severity = determineSeverity(normalizedError);
    const presentationType = determinePresentation(normalizedError, context);
    
    const event: ErrorEvent = {
      error: normalizedError,
      timestamp: Date.now(),
      context,
      handled: false,
    };

    this.activeErrors.push(event);

    // Determine presentation
    const presentation: ErrorPresentation = {
      ...this.config.defaultPresentation,
      type: presentationType,
      severity,
      ...presentationOverrides,
    };

    // Add action for retryable errors
    if (normalizedError.retry.retryable && presentation.type === 'toast') {
      presentation.action = {
        label: 'Retry',
        onClick: () => {
          // Retry action - handler should implement actual retry
          this.dismissError(errorId);
        },
      };
    }

    // Notify global error callback
    if (this.config.onError) {
      try {
        this.config.onError(event);
      } catch {
        // Don't let logging errors break error handling
      }
    }

    // Notify all registered handlers
    this.notifyHandlers(event);

    return normalizedError;
  }

  /**
   * Handle API call errors with retry logic
   */
  async handleApiError<T>(
    operation: () => Promise<T>,
    context?: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? 0;
    let lastError: StreamPayError | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const normalizedError = isStreamPayError(error)
          ? error
          : normalizeError(error);

        lastError = normalizedError;

        // Check if retryable
        if (normalizedError.retry.retryable && attempt < retries) {
          const guidance = getRetryGuidance(normalizedError.code);
          const delay = guidance.suggestedDelayMs || 1000 * Math.pow(2, attempt);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Not retryable or exhausted retries - handle error
        this.handleError(normalizedError, context);
        throw normalizedError;
      }
    }

    // Should not reach here, but just in case
    if (lastError) {
      this.handleError(lastError, context);
      throw lastError;
    }

    throw normalizeError(new Error('Unknown error in API operation'));
  }

  /**
   * Dismiss an active error
   */
  dismissError(errorId: number): void {
    const index = this.activeErrors.findIndex(
      (_, i) => i + 1 === errorId
    );
    
    if (index !== -1) {
      const event = this.activeErrors[index];
      this.activeErrors.splice(index, 1);
      this.notifyHandlers({ ...event, handled: true });
    }
  }

  /**
   * Dismiss all errors
   */
  dismissAllErrors(): void {
    for (const event of this.activeErrors) {
      this.notifyHandlers({ ...event, handled: true });
    }
    this.activeErrors = [];
  }

  /**
   * Get all active errors
   */
  getActiveErrors(): ErrorEvent[] {
    return [...this.activeErrors];
  }

  /**
   * Check if there are active errors
   */
  hasActiveErrors(): boolean {
    return this.activeErrors.length > 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Notify all registered handlers
   */
  private notifyHandlers(event: ErrorEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event.error);
      } catch {
        // Don't let handler errors break other handlers
      }
    }
  }
}

// Singleton instance
let globalInstance: GlobalErrorHandler | null = null;

/**
 * Get or create the global error handler instance
 */
export function getGlobalErrorHandler(
  config?: Partial<ErrorHandlerConfig>
): GlobalErrorHandler {
  if (!globalInstance) {
    globalInstance = new GlobalErrorHandler(config);
  } else if (config) {
    globalInstance.updateConfig(config);
  }
  return globalInstance;
}

/**
 * Reset the global error handler (useful for testing)
 */
export function resetGlobalErrorHandler(): void {
  globalInstance = null;
}

/**
 * Convenience function to handle an error
 */
export function handleError(
  error: unknown,
  context?: string,
  presentation?: Partial<ErrorPresentation>
): StreamPayError {
  return getGlobalErrorHandler().handleError(error, context, presentation);
}

/**
 * Convenience function for API error handling with retry
 */
export function handleApiCall<T>(
  operation: () => Promise<T>,
  context?: string,
  maxRetries?: number
): Promise<T> {
  return getGlobalErrorHandler().handleApiError(operation, context, maxRetries);
}

/**
 * React hook for error handling (to be used in components)
 */
export function useErrorHandler(context?: string) {
  const handler = getGlobalErrorHandler();

  return {
    handleError: (error: unknown, presentation?: Partial<ErrorPresentation>) =>
      handler.handleError(error, context, presentation),
    handleApiCall: <T>(operation: () => Promise<T>, maxRetries?: number) =>
      handler.handleApiError(operation, context, maxRetries),
    activeErrors: handler.getActiveErrors(),
    dismissError: (id: number) => handler.dismissError(id),
    dismissAll: () => handler.dismissAllErrors(),
  };
}

/**
 * Form error helper - extracts field errors from StreamPayError
 */
export function getFormErrors(
  error: StreamPayError
): Record<string, string> | undefined {
  return error.meta?.fieldErrors;
}

/**
 * Check if error has field-level validation errors
 */
export function hasFieldErrors(error: StreamPayError): boolean {
  const fieldErrors = error.meta?.fieldErrors;
  return !!fieldErrors && Object.keys(fieldErrors).length > 0;
}

/**
 * Get first field error message
 */
export function getFirstFieldError(error: StreamPayError): string | undefined {
  const fieldErrors = error.meta?.fieldErrors;
  if (!fieldErrors) return undefined;
  
  const entries = Object.entries(fieldErrors);
  return entries.length > 0 ? entries[0][1] : undefined;
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: StreamPayError): {
  title: string;
  message: string;
  requestId?: string;
  canRetry: boolean;
} {
  return {
    title: error.title,
    message: error.detail || getUserMessage(error.code),
    requestId: error.requestId,
    canRetry: error.retry.retryable,
  };
}
