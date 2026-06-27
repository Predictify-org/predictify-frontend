"use client";

import { useContext } from "react";
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastSeverity,
} from "@/app/components/ToastProvider";

export type { ToastInput, ToastSeverity };

export interface ToastHelpers extends ToastContextValue {
  success: (message: string, options?: Omit<ToastInput, "message" | "severity">) => string;
  error: (message: string, options?: Omit<ToastInput, "message" | "severity">) => string;
  warning: (message: string, options?: Omit<ToastInput, "message" | "severity">) => string;
  info: (message: string, options?: Omit<ToastInput, "message" | "severity">) => string;
}

export function useToast(): ToastHelpers {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const severityToast = (
    severity: ToastSeverity,
    message: string,
    options?: Omit<ToastInput, "message" | "severity">
  ) =>
    context.toast({
      ...options,
      message,
      severity,
    });

  return {
    ...context,
    success: (message, options) => severityToast("success", message, options),
    error: (message, options) => severityToast("error", message, options),
    warning: (message, options) => severityToast("warning", message, options),
    info: (message, options) => severityToast("info", message, options),
  };
}
