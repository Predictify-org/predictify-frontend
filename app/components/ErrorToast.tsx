"use client";

import { useEffect, useState, useCallback } from "react";
import type { StreamPayError } from "@/app/lib/errors/types";
import { isRetryableError } from "@/app/lib/errors/codes";
import { formatErrorForDisplay } from "@/app/lib/errors/handler";

interface ErrorToastProps {
  error: StreamPayError;
  onDismiss: () => void;
  onRetry?: () => void;
  autoDismiss?: boolean;
  autoDismissDelayMs?: number;
  showRequestId?: boolean;
}

/**
 * Toast positioning and styling
 */
const toastStyles = {
  base: "fixed z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden",
  positions: {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  },
  severity: {
    info: "border-l-4 border-l-blue-500",
    warning: "border-l-4 border-l-yellow-500",
    error: "border-l-4 border-l-red-500",
    critical: "border-l-4 border-l-red-600 bg-red-50",
  },
};

/**
 * Error Toast Component
 * 
 * Displays transient error notifications that auto-dismiss.
 * Suitable for non-critical errors that don't block user flow.
 */
export function ErrorToast({
  error,
  onDismiss,
  onRetry,
  autoDismiss = true,
  autoDismissDelayMs = 5000,
  showRequestId = false,
}: ErrorToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const formatted = formatErrorForDisplay(error);
  const canRetry = isRetryableError(error.code) && onRetry;

  // Auto-dismiss with progress
  useEffect(() => {
    if (!autoDismiss) return;

    const startTime = Date.now();
    const duration = autoDismissDelayMs;

    const updateProgress = () => {
      if (isPaused) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;
      
      setProgress(newProgress);

      if (remaining <= 0) {
        onDismiss();
      }
    };

    const interval = setInterval(updateProgress, 50);
    return () => clearInterval(interval);
  }, [autoDismiss, autoDismissDelayMs, isPaused, onDismiss]);

  const handleRetry = useCallback(() => {
    onRetry?.();
    onDismiss();
  }, [onRetry, onDismiss]);

  const severity = error.category === "server" ? "critical" : 
                   error.category === "auth" ? "warning" : "error";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`${toastStyles.base} ${toastStyles.severity[severity]}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="error-toast"
      data-error-code={error.code}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {severity === "critical" ? (
              <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : severity === "warning" ? (
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {formatted.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {formatted.message}
            </p>
            
            {showRequestId && formatted.requestId && (
              <p className="text-xs text-gray-500 mt-2">
                Ref: {formatted.requestId}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            {canRetry && (
              <button
                onClick={handleRetry}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                aria-label="Retry"
              >
                Retry
              </button>
            )}
            
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {autoDismiss && (
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-red-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Toast Container
 * 
 * Manages multiple toast notifications
 */
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    error: StreamPayError;
    position?: keyof typeof toastStyles.positions;
  }>;
  onDismiss: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function ToastContainer({
  toasts,
  onDismiss,
  onRetry,
}: ToastContainerProps) {
  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    const position = toast.position || "top-right";
    if (!acc[position]) acc[position] = [];
    acc[position].push(toast);
    return acc;
  }, {} as Record<string, typeof toasts>);

  return (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-50 flex flex-col gap-2 ${toastStyles.positions[position as keyof typeof toastStyles.positions]}`}
          aria-label={`Notifications ${position}`}
        >
          {positionToasts.map((toast) => (
            <ErrorToast
              key={toast.id}
              error={toast.error}
              onDismiss={() => onDismiss(toast.id)}
              onRetry={onRetry ? () => onRetry(toast.id) : undefined}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Toast Manager Hook
 * 
 * Manages toast state and animations
 */
export function useToastManager() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    error: StreamPayError;
    position?: keyof typeof toastStyles.positions;
  }>>([]);

  const addToast = useCallback((
    error: StreamPayError,
    position?: keyof typeof toastStyles.positions
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, error, position }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };
}
