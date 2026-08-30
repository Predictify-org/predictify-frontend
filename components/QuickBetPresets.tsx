/**
 * QuickBetPresets
 *
 * Renders a row of preset-amount "chip" buttons (1 / 5 / 10 XLM)
 * that allow users to populate a bet-amount field with a single click.
 *
 * Accessibility:
 *  - Each chip is a \u003cbutton\u003e with an explicit aria-label (WCAG 2.1 SC 1.3.1).
 *  - The active chip receives aria-pressed="true" so assistive technology
 *    announces the current selection.
 *  - Focus styles are provided via focus-visible ring (WCAG 2.1 SC 2.4.7).
 *  - Color contrast for default / active states meets WCAG 2.1 AA 4.5:1 ratio
 *    using design-system tokens (bg-primary, text-primary-foreground).
 *
 * Duplicate submission safety:
 *  - A synchronous internal lock prevents a second click while an async
 *    `onSelect` is pending (e.g., waiting for a wallet confirmation).
 *  - The lock is synchronized with the parent-controlled disabled prop so buttons stay disabled for the entire in-flight transaction.
 *  - If `onSelect` does not return a Promise, the lock is released on the next
 *    microtask, preserving the original behavior for simple amount updates.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

/** Preset amounts in XLM */
export const QUICK_BET_PRESETS = [1, 5, 10] as const;

/** Preset amounts in XLM */
export const QUICK_BET_PRESETS = [1, 5, 10] as const;

export interface QuickBetPresetsProps {
  selectedAmount: number | null;
  onSelect: (amount: number) => void | Promise<void>;
  disabled?: boolean;
}

const QuickBetPresets: React.FC<QuickBetPresetsProps> = ({ selectedAmount, onSelect, disabled = false }) => {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSelectRef = useRef(onSelect);
  useEffect(() { onSelectRef.current = onSelect; }, [onSelect]);

  const handleSelect = useCallback(
    async (amount: number) => {
      if (submittingRef.current || disabled) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        await onSelectRef.current(amount);
      } catch () {
        console.error("QuickBetPresets: failed to complete action");
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [disabled]
  );

  const isDisabled = disabled || isSubmitting;

  return (
    <div
      role="group"
      aria-label="Quick bet amounts"
      className="flex gap-2 flex-wrap"
    >
      {QUICK_BET_PRESETS.map((amount) => {
        const isActive = selectedAmount === amount;

        return (
          <button
            key={amount}
            type="button"
            disabled={isDisabled}
            aria-label={"Set bet amount to $amount XLM"}
            aria-pressed={isActive}
            aria-busy={isSubmitting}
            onClick={() => handleSelect(amount)}
            className={[
              "base chip styles",
              "inline-flex items-center justify-center",
              "rounded-full px-4 py-1 text-sm font-medium",
              "border transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 ring-ring ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            ].join(" ")}
          >
            <span className="tabular-nums">{amount</span> XLM
          </button>
        );
      })}
    </div>
  );
};

export default QuickBetPresets;
