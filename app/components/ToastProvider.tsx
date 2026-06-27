"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastSeverity = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title?: string;
  message: string;
  severity?: ToastSeverity;
  /** Auto-dismiss delay in ms; set to 0 to persist until manual dismiss. */
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  severity: ToastSeverity;
  duration: number;
  action?: ToastInput["action"];
}

export interface ToastContextValue {
  toast: (input: ToastInput | string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const DEFAULT_TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 5;

export const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

function createToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

function normalizeToastInput(input: ToastInput | string): ToastInput {
  if (typeof input === "string") {
    return { message: input };
  }
  return input;
}

function SeverityIcon({ severity }: { severity: ToastSeverity }) {
  const className = `toast-queue__icon toast-queue__icon--${severity}`;

  switch (severity) {
    case "success":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "warning":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "info":
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "error":
    default:
      return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const dismissRef = useRef(onDismiss);

  dismissRef.current = onDismiss;

  useEffect(() => {
    if (item.duration <= 0) return;

    const startedAt = Date.now();
    let interval: number | undefined;

    const timeout = window.setTimeout(() => {
      dismissRef.current(item.id);
    }, item.duration);

    interval = window.setInterval(() => {
      if (isPaused) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, item.duration - elapsed);
      setProgress((remaining / item.duration) * 100);
    }, 50);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [item.duration, item.id, isPaused]);

  const handleAction = () => {
    item.action?.onClick();
    onDismiss(item.id);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`toast-queue__item toast-queue__item--${item.severity}`}
      data-testid="toast-item"
      data-severity={item.severity}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="toast-queue__body">
        <SeverityIcon severity={item.severity} />

        <div className="toast-queue__content">
          {item.title ? <p className="toast-queue__title">{item.title}</p> : null}
          <p className="toast-queue__message">{item.message}</p>
        </div>

        <div className="toast-queue__actions">
          {item.action ? (
            <button
              type="button"
              className="toast-queue__action"
              onClick={handleAction}
            >
              {item.action.label}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-queue__dismiss"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(item.id)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {item.duration > 0 ? (
        <div className="toast-queue__progress-track" aria-hidden="true">
          <div
            className="toast-queue__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

interface ToastViewportProps {
  visible: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ visible, onDismiss }: ToastViewportProps) {
  if (visible.length === 0) return null;

  return (
    <div
      className="toast-queue"
      aria-label="Notifications"
      data-testid="toast-queue"
    >
      {visible.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setQueue([]);
  }, []);

  const toast = useCallback((input: ToastInput | string) => {
    const normalized = normalizeToastInput(input);
    const id = createToastId();
    const item: ToastItem = {
      id,
      title: normalized.title,
      message: normalized.message,
      severity: normalized.severity ?? "info",
      duration: normalized.duration ?? DEFAULT_TOAST_DURATION_MS,
      action: normalized.action,
    };

    setQueue((prev) => [...prev, item]);
    return id;
  }, []);

  const visible = queue.slice(0, MAX_VISIBLE_TOASTS);

  const value = useMemo(
    () => ({
      toast,
      dismiss,
      dismissAll,
    }),
    [toast, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport visible={visible} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
