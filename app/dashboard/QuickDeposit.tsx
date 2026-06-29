"use client";

import React, { useId, useState } from "react";

/**
 * QuickDeposit
 *
 * Inline dashboard card that lets a user quickly deposit XLM into their
 * streaming balance without navigating to a separate page.
 *
 * ## Behaviour
 * - Controlled amount input with quick-select preset chips (10 / 50 / 100).
 * - Client-side validation: positive decimal, at most 7 fractional digits
 *   (Stellar precision). Errors are announced to assistive tech.
 * - On submit, calls `onDeposit(amount)` and reflects a pending state while
 *   the promise resolves.
 *
 * ## Accessibility (WCAG 2.1 AA)
 * - The card is a labelled `<form>`; the input has an associated `<label>`.
 * - Validation errors use `role="alert"` and are linked via `aria-describedby`.
 * - The submit button exposes `aria-busy` while a deposit is in flight.
 *
 * ## Theming
 * Uses design tokens (`--card-surface`, `--card-border`, `--accent`, …) so it
 * is consistent in both light and dark mode.
 */

export interface QuickDepositProps {
  /**
   * Called with the validated amount (as a string in XLM) when the user
   * submits. May be async; the card shows a pending state until it settles.
   */
  onDeposit: (amount: string) => void | Promise<void>;
  /** Asset symbol shown in the UI. Defaults to "XLM". */
  asset?: string;
  /** Preset quick-amount chips. Defaults to 10 / 50 / 100. */
  presets?: readonly number[];
  /** Disables the whole card (e.g. wallet not connected). */
  disabled?: boolean;
}

/** Positive decimal with up to 7 fractional digits (Stellar precision). */
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,7})?$/;

function validateAmount(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "Enter an amount to deposit.";
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return "Amount must be a positive number with up to 7 decimal places.";
  }
  if (Number(trimmed) <= 0) return "Amount must be greater than zero.";
  return null;
}

export function QuickDeposit({
  onDeposit,
  asset = "XLM",
  presets = [10, 50, 100],
  disabled = false,
}: QuickDepositProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const inputId = useId();
  const errorId = useId();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setPending(true);
    try {
      await onDeposit(amount.trim());
      setAmount("");
    } catch {
      setError("Deposit failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const isDisabled = disabled || pending;

  return (
    <form className="quick-deposit" onSubmit={handleSubmit} aria-labelledby={`${inputId}-title`}>
      <div className="quick-deposit__header">
        <h3 id={`${inputId}-title`} className="quick-deposit__title">
          Quick deposit
        </h3>
        <span className="quick-deposit__asset" aria-hidden="true">
          {asset}
        </span>
      </div>

      <p className="quick-deposit__hint">Top up your balance to keep streams flowing.</p>

      <div className="quick-deposit__presets" role="group" aria-label="Preset amounts">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="quick-deposit__chip"
            onClick={() => {
              setAmount(String(preset));
              setError(null);
            }}
            disabled={isDisabled}
          >
            {preset} {asset}
          </button>
        ))}
      </div>

      <label className="quick-deposit__label" htmlFor={inputId}>
        Amount ({asset})
      </label>
      <input
        id={inputId}
        className="quick-deposit__input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
          if (error) setError(null);
        }}
        placeholder="0.00"
        disabled={isDisabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <p id={errorId} className="quick-deposit__error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="button button--primary quick-deposit__submit"
        disabled={isDisabled}
        aria-busy={pending}
      >
        {pending ? "Depositing…" : `Deposit ${asset}`}
      </button>

      <style jsx>{`
        .quick-deposit {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1.25rem;
          background: var(--card-surface);
          border: 1px solid var(--card-border);
          border-radius: 1rem;
          width: 100%;
          max-width: 28rem;
        }
        .quick-deposit__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .quick-deposit__title {
          font-size: 1.05rem;
          margin: 0;
        }
        .quick-deposit__asset {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--accent);
        }
        .quick-deposit__hint {
          margin: 0;
          font-size: 0.85rem;
          color: var(--muted);
        }
        .quick-deposit__presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .quick-deposit__chip {
          flex: 1 1 auto;
          min-width: 4.5rem;
          padding: 0.45rem 0.5rem;
          font-size: 0.85rem;
          color: var(--text, inherit);
          background: transparent;
          border: 1px solid var(--card-border);
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .quick-deposit__chip:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }
        .quick-deposit__chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .quick-deposit__label {
          font-size: 0.8rem;
          color: var(--muted);
        }
        .quick-deposit__input {
          padding: 0.6rem 0.75rem;
          font-size: 1rem;
          color: var(--text, inherit);
          background: var(--bg, transparent);
          border: 1px solid var(--card-border);
          border-radius: 0.5rem;
        }
        .quick-deposit__input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .quick-deposit__error {
          margin: 0;
          font-size: 0.8rem;
          color: #ef4444;
        }
        .quick-deposit__submit {
          margin-top: 0.25rem;
        }
      `}</style>
    </form>
  );
}

export default QuickDeposit;
