"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import "@/styles/patterns.css"; // Ensure patterns are loaded if used directly

export type AmountStatus = "idle" | "success" | "warning" | "error";

export interface AmountInputProps {
  status?: AmountStatus;
  message?: string;
  onChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
}

/**
 * AmountInput Component
 *
 * Implements a responsive, accessible number input field with status chips.
 * Uses color-blind safe patterns (WCAG 2.1 AA compliant) for statuses:
 * - error, warning, success
 *
 * It is fully responsive, adapts to dark mode, and implements ARIA attributes
 * for screen readers.
 */
export const AmountInput: React.FC<AmountInputProps> = ({
  status = "idle",
  message,
  onChange,
  value,
  defaultValue,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const getStatusPatternClass = (currentStatus: AmountStatus) => {
    switch (currentStatus) {
      case "error":
        return "status-pattern-error text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
      case "warning":
        return "status-pattern-warning text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "success":
        return "status-pattern-success text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (currentStatus: AmountStatus) => {
    switch (currentStatus) {
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "success":
        return "Success";
      default:
        return "Idle";
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <label htmlFor="amount-input" className="text-sm font-medium text-foreground">
        Amount
      </label>
      <div className="relative">
        <input
          id="amount-input"
          type="number"
          value={currentValue}
          onChange={handleChange}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={status === "error"}
          aria-describedby={message || status !== "idle" ? "amount-status" : undefined}
          placeholder="0.00"
        />
      </div>

      {(message || status !== "idle") && (
        <div id="amount-status" className="flex items-center gap-2 mt-1" role="status">
          {status !== "idle" && (
            <Badge
              variant="outline"
              className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${getStatusPatternClass(
                status
              )}`}
            >
              <span className="sr-only">Status: </span>
              {getStatusText(status)}
            </Badge>
          )}
          {message && (
            <span className="text-xs text-muted-foreground">{message}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AmountInput;
