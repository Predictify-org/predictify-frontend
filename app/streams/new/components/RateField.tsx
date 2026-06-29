"use client";

import { useId, useState } from "react";

/** Supported streaming rate units. */
export type RateUnit = "second" | "hour" | "day";

export const RATE_UNIT_OPTIONS: { value: RateUnit; label: string; suffix: string }[] = [
  { value: "second", label: "Per second", suffix: "tokens/s" },
  { value: "hour", label: "Per hour", suffix: "tokens/h" },
  { value: "day", label: "Per day", suffix: "tokens/d" },
];

const RATE_UNIT_HELP: Record<RateUnit, string> = {
  second: "tokens/s — tokens released every second. Best for short, high-frequency streams.",
  hour: "tokens/h — tokens released each hour. A balanced default for most payroll-style streams.",
  day: "tokens/d — tokens released each day. Best for long-running or low-frequency streams.",
};

type RateFieldProps = {
  value: string;
  unit: RateUnit;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: RateUnit) => void;
};

/**
 * Stream rate input with inline help.
 *
 * Pairs a numeric amount with a unit selector and an accessible, toggle-able
 * help panel that explains what each rate unit (tokens/s, tokens/h, tokens/d)
 * means, so users understand the cadence before creating a stream.
 */
export function RateField({ value, unit, onValueChange, onUnitChange }: RateFieldProps) {
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();
  const suffix = RATE_UNIT_OPTIONS.find((o) => o.value === unit)?.suffix ?? "";

  return (
    <div className="rate-field">
      <div className="rate-field__header">
        <label className="rate-field__label" htmlFor="stream-rate">
          Stream rate
        </label>
        <button
          type="button"
          className="rate-field__help-toggle"
          aria-expanded={showHelp}
          aria-controls={helpId}
          onClick={() => setShowHelp((open) => !open)}
        >
          <span aria-hidden="true">?</span>
          <span className="sr-only">
            {showHelp ? "Hide rate unit help" : "Show rate unit help"}
          </span>
        </button>
      </div>

      <div className="rate-field__inputs">
        <input
          id="stream-rate"
          className="rate-field__amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-describedby={helpId}
        />
        <select
          className="rate-field__unit"
          aria-label="Rate unit"
          value={unit}
          onChange={(event) => onUnitChange(event.target.value as RateUnit)}
        >
          {RATE_UNIT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="rate-field__suffix" aria-hidden="true">
          {suffix}
        </span>
      </div>

      <p id={helpId} className="rate-field__help" hidden={!showHelp} role="note">
        {RATE_UNIT_HELP[unit]}
      </p>
    </div>
  );
}
