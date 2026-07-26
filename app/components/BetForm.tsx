/**
 * BetForm
 *
 * A simple form for placing a bet.  Includes QuickBetPresets chips so users
 * can populate the amount field with one click rather than typing.
 *
 * Accessibility:
 *  - All interactive elements have associated labels (WCAG 2.1 SC 1.3.1).
 *  - Error messages are linked via aria-describedby (WCAG 2.1 SC 3.3.1).
 *  - Focus management follows logical DOM order.
 *  - Visible :focus-visible outlines on all interactive controls (WCAG 2.1 SC 2.4.7).
 */

"use client";

import React, { useState, useEffect } from "react";
import QuickBetPresets from "@/components/QuickBetPresets";
import KbdHint from "../../src/components/KbdHint";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface BetFormProps {
  /** Called with the chosen amount (in XLM) when the form is submitted. */
  onSubmit?: (amount: number) => void;
}

/**
 * Controlled bet form with quick-preset chips and a free-text amount input.
 */
const BetForm: React.FC<BetFormProps> = ({ onSubmit }) => {
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  /** The numeric value of the current input, or null when empty / invalid. */
  const numericAmount = amount !== "" && !isNaN(Number(amount)) ? Number(amount) : null;

  /** Sync the text input when a preset chip is clicked. */
  const handlePresetSelect = (preset: number) => {
    setAmount(String(preset));
    setError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError(null);
  };

  const attemptSubmit = () => {
    if (numericAmount === null || numericAmount <= 0) {
      setError("Please enter a valid bet amount greater than 0 XLM.");
      return;
    }

    onSubmit?.(numericAmount);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    attemptSubmit();
  };

  // Keyboard shortcut listener for Cmd+Enter / Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        attemptSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [numericAmount, onSubmit]);

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Place a bet">
      <div className="flex flex-col gap-3">
        {/* Preset chips */}
        <QuickBetPresets
          selectedAmount={numericAmount}
          onSelect={handlePresetSelect}
        />

        {/* Free-text amount input */}
        <div className="flex flex-col gap-1 relative">
          <label
            htmlFor="bet-amount"
            className="text-label text-foreground"
          >
            Amount (XLM)
          </label>
          <input
            id="bet-amount"
            type="number"
            min="0.0000001"
            step="any"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            aria-describedby={error ? "bet-amount-error" : undefined}
            aria-invalid={error ? true : undefined}
            className={[
              "w-full rounded-md border px-3 py-2 text-body-sm tabular-nums",
              "bg-background text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background",
              error
                ? "border-destructive focus-visible:ring-destructive"
                : "border-border",
            ].join(" ")}
          />
          {error && (
            <p
              id="bet-amount-error"
              role="alert"
              className="text-body-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={[
            "w-full rounded-md px-4 py-2 text-body-sm font-semibold flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            !reducedMotion && "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-background",
          ].join(" ")}
        >
          <span>Place Bet</span>
          <div className="flex items-center gap-1 opacity-80">
            <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">⌘</KbdHint>
            <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">↵</KbdHint>
          </div>
        </button>
      </div>
    </form>
  );
};

export default BetForm;

/**
 * BetFormSkeleton
 *
 * Skeleton placeholder that mirrors the exact layout/shape of BetForm
 * so the loading state preserves layout parity (no layout shift).
 *
 * Structure mirrors BetForm:
 *   1. Three preset chips (1 / 5 / 10 XLM) - matching QuickBetPresets dimensions
 *   2. Amount label + input
 *   3. Submit button
 */
export const BetFormSkeleton: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-3" aria-busy="true" data-testid="bet-form-skeleton">
      {/* Preset chips - 3 chips matching QuickBetPresets exactly */}
      <div role="group" aria-label="Quick bet amounts" className="flex gap-2 flex-wrap">
        <Skeleton
          className="h-7 w-18 rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        <Skeleton
          className="h-7 w-18 rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        <Skeleton
          className="h-7 w-20 rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
      </div>

      {/* Amount label + input */}
      <div className="flex flex-col gap-1">
        <Skeleton
          className="h-5 w-22 rounded-md"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        <Skeleton
          className="h-10 w-full rounded-md border"
          aria-hidden="true"
          animate={!reducedMotion}
        />
      </div>

      {/* Submit button */}
      <Skeleton
        className="w-full rounded-md h-10"
        aria-hidden="true"
        animate={!reducedMotion}
      />
    </div>
  );
};
