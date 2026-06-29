/**
 * QuickBetPresets
 *
 * Renders a row of preset-amount "chip" buttons (1 / 5 / 10 XLM) that allow
 * users to populate a bet-amount field with a single click.
 *
 * Accessibility:
 *  - Each chip is a <button> with an explicit aria-label (WCAG 2.1 SC 1.3.1).
 *  - The active chip receives aria-pressed="true" so assistive technology
 *    announces the current selection.
 *  - Focus styles are provided via focus-visible ring (WCAG 2.1 SC 2.4.7).
 *  - Color contrast for default / active states meets WCAG 2.1 AA 4.5:1 ratio
 *    using design-system tokens (bg-primary, text-primary-foreground).
 */

import React from "react";

/** Preset amounts in XLM */
export const QUICK_BET_PRESETS: readonly number[] = [1, 5, 10] as const;

export interface QuickBetPresetsProps {
  /** Currently selected preset amount (or null if the user typed a custom value). */
  selectedAmount: number | null;
  /** Called with the clicked preset value. */
  onSelect: (amount: number) => void;
  /** Optional: disable all chips (e.g. while a transaction is in flight). */
  disabled?: boolean;
}

/**
 * A horizontal strip of preset-amount chips for the BetForm.
 *
 * @example
 * <QuickBetPresets
 *   selectedAmount={amount}
 *   onSelect={(v) => setAmount(v)}
 * />
 */
const QuickBetPresets: React.FC<QuickBetPresetsProps> = ({
  selectedAmount,
  onSelect,
  disabled = false,
}) => {
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
            disabled={disabled}
            aria-label={`Set bet amount to ${amount} XLM`}
            aria-pressed={isActive}
            onClick={() => onSelect(amount)}
            className={[
              // Base chip styles
              "inline-flex items-center justify-center",
              "rounded-full px-4 py-1 text-sm font-medium",
              "border transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              // Active vs. inactive appearance using design-system tokens
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted",
            ].join(" ")}
          >
            {amount} XLM
          </button>
        );
      })}
    </div>
  );
};

export default QuickBetPresets;
