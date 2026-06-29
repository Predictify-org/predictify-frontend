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
 */

"use client";

import React, { useState } from "react";
import QuickBetPresets from "@/components/QuickBetPresets";

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (numericAmount === null || numericAmount <= 0) {
      setError("Please enter a valid bet amount greater than 0 XLM.");
      return;
    }

    onSubmit?.(numericAmount);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Place a bet">
      <div className="flex flex-col gap-3">
        {/* Preset chips */}
        <QuickBetPresets
          selectedAmount={numericAmount}
          onSelect={handlePresetSelect}
        />

        {/* Free-text amount input */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="bet-amount"
            className="text-sm font-medium text-foreground"
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
              "w-full rounded-md border px-3 py-2 text-sm",
              "bg-background text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              error ? "border-destructive" : "border-border",
            ].join(" ")}
          />
          {error && (
            <p
              id="bet-amount-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={[
            "w-full rounded-md px-4 py-2 text-sm font-semibold",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ].join(" ")}
        >
          Place Bet
        </button>
      </div>
    </form>
  );
};

export default BetForm;
