"use client";

import { useEffect, useState } from "react";
import type { StreamPayError } from "@/app/lib/errors/types";
import { isRetryableError } from "@/app/lib/errors/codes";
import { formatErrorForDisplay } from "@/app/lib/errors/handler";

interface ErrorBannerProps {
  error: StreamPayError;
  onDismiss?: () => void;
  onRetry?: () => void;
  showRequestId?: boolean;
  className?: string;
}

/**
 * Severity-based styling
 */
const severityStyles = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-500",
    button: "bg-blue-100 hover:bg-blue-200 text-blue-800",
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: "text-yellow-500",
    button: "bg-yellow-100 hover:bg-yellow-200 text-yellow-800",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-500",
    button: "bg-red-100 hover:bg-red-200 text-red-800",
  },
  critical: {
    container: "bg-red-100 border-red-300 text-red-900",
    icon: "text-red-600",
    button: "bg-red-200 hover:bg-red-300 text-red-900",
  },
};

/**
 * Error Banner Component
 * 
 * Displays persistent errors at the top of a page or section.
 * Suitable for critical errors that need user attention.
 */
export function ErrorBanner({
  error,
  onDismiss,
  onRetry,
  showRequestId = false,
  className = "",
}: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const formatted = formatErrorForDisplay(error);
  const styles = severityStyles[error.category === "server" ? "critical" : "error"];
  const canRetry = isRetryableError(error.code) && onRetry;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    onRetry?.();
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-lg border p-4 ${styles.container} ${className}`}
      data-testid="error-banner"
      data-error-code={error.code}
    >
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <svg
          className={`h-5 w-5 flex-shrink-0 mt-0.5 ${styles.icon}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>

        {/* Error Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{formatted.title}</h3>
          <p className="text-sm mt-1">{formatted.message}</p>
          
          {/* Request ID (for support) */}
          {showRequestId && formatted.requestId && (
            <p className="text-xs mt-2 opacity-75">
              Reference: {formatted.requestId}
            </p>
          )}

          {/* Debug Info (Development Only) */}
          {error.debug && process.env.NODE_ENV !== "production" && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer opacity-75">
                Debug Details
              </summary>
              <pre className="text-xs mt-2 p-2 bg-black/5 rounded overflow-auto max-h-40">
                {JSON.stringify(error.debug, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canRetry && (
            <button
              onClick={handleRetry}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${styles.button}`}
              aria-label="Retry operation"
            >
              Retry
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className={`p-1.5 rounded-md transition-colors ${styles.button}`}
              aria-label="Dismiss error"
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Error Banner Container
 * 
 * Manages multiple error banners with stacking
 */
interface ErrorBannerContainerProps {
  errors: StreamPayError[];
  onDismiss?: (index: number) => void;
  onRetry?: (index: number) => void;
  maxErrors?: number;
}

export function ErrorBannerContainer({
  errors,
  onDismiss,
  onRetry,
  maxErrors = 3,
}: ErrorBannerContainerProps) {
  const visibleErrors = errors.slice(0, maxErrors);
  const remainingCount = errors.length - maxErrors;

  return (
    <div className="space-y-2" role="region" aria-label="Error messages">
      {visibleErrors.map((error, index) => (
        <ErrorBanner
          key={`${error.code}-${index}`}
          error={error}
          onDismiss={onDismiss ? () => onDismiss(index) : undefined}
          onRetry={onRetry ? () => onRetry(index) : undefined}
          showRequestId={index === 0} // Only show request ID on first error
        />
      ))}
      
      {remainingCount > 0 && (
        <p className="text-sm text-gray-600 text-center">
          +{remainingCount} more error{remainingCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
