/**
 * BetForm
 *
 * A simple form for placing a bet. Includes QuickBetPresets chips so users
 * can populate the amount field with one click rather than typing.
 *
 * Responsive breakpoint audit (v7 — GrantFox FWC26):
 *  - Narrow (< sm / < 640 px):
 *    • Form fills available width with compact px-3 py-2 padding.
 *    • Preset chips wrap to a second row rather than overflowing.
 *    • Submit button stacks full-width below the input.
 *    • Each chip has a min-w-[60px] guard so it never collapses below a
 *      touchable target size.
 *  - Default (sm – lg / 640 – 1024 px):
 *    • Wrapper caps at max-w-sm and centres within its parent.
 *    • Chip row uses justify-start so chips left-align instead of stretching.
 *  - Wide (≥ lg / ≥ 1024 px):
 *    • max-w-sm keeps the form from becoming an overly wide single column;
 *      the surrounding layout is responsible for placing it in a sidebar
 *      or constrained slot.
 *
 * Accessibility:
 *  - All interactive elements have associated labels (WCAG 2.1 SC 1.3.1).
 *  - Error messages are linked via aria-describedby (WCAG 2.1 SC 3.3.1).
 *  - Focus management follows logical DOM order.
 *  - Visible :focus-visible outlines on all interactive controls (WCAG 2.1 SC 2.4.7).
 *  - Minimum touch target 44×44 px on mobile (WCAG 2.5.5).
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import QuickBetPresets from "@/components/QuickBetPresets";
import KbdHint from "../../src/components/KbdHint";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Skeleton } from "@/components/ui/skeleton";

export interface BetFormProps {
  /** Called with the chosen amount (in XLM) when the form is submitted. */
  onSubmit?: (amount: number) => void;
  /** Whether the form is currently loading its initial data. */
  isLoading?: boolean;
}

/**
 * Controlled bet form with quick-preset chips and a free-text amount input.
 */
const BetForm: React.FC<BetFormProps> = ({ onSubmit, isLoading = false }) => {
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  /** Tracks whether the scrollable content area has been scrolled, so the
   *  sticky action bar can grow a divider/shadow once content scrolls behind it. */
  const [bodyScrolled, setBodyScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = () => {
    setBodyScrolled((bodyRef.current?.scrollTop ?? 0) > 0);
  };

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

    if (!isLoading) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [numericAmount, onSubmit, isLoading]);

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        data-testid="betform-skeleton"
      >
        {/* Preset chips row */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-[30px] min-w-[60px] w-[70px] rounded-full" />
          <Skeleton className="h-[30px] min-w-[60px] w-[70px] rounded-full" />
          <Skeleton className="h-[30px] min-w-[60px] w-[80px] rounded-full" />
        </div>
        {/* Label + input */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-[38px] w-full rounded-md" />
        </div>
        {/* Submit button */}
        <Skeleton className="h-[44px] w-full rounded-md" />
      </div>
    );
  }

  return (
    /*
     * Responsive wrapper
     * ─────────────────
     * w-full   — fill the slot the parent provides on all viewports.
     * max-w-sm — cap the form at ~384 px on ≥sm so it never stretches into
     *            an unusable wide single column on desktop.
     * mx-auto  — centre within the slot when it is wider than max-w-sm.
     *
     * No horizontal padding here — the parent card/panel is responsible for
     * its own gutters so we don't double-pad.
     */
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Place a bet"
      className="w-full max-w-sm mx-auto"
      data-testid="betform"
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        {/*
         * Scrollable content area
         * ──────────────────────
         * Wraps the preset chips and amount input in a max-height container
         * so that on constrained viewports the content scrolls independently
         * while the sticky action bar below remains reachable.
         */
        }
        <div
          ref={bodyRef}
          onScroll={handleBodyScroll}
          className="max-h-[min(60vh,26rem)] overflow-y-auto flex flex-col gap-3 sm:gap-4"
        >
          {/*
           * Preset chips
           * ────────────
           * flex-wrap    — chips wrap on narrow viewports instead of overflowing.
           * gap-2        — consistent horizontal + vertical gap between chips.
           * justify-start — left-align chips; they should not stretch to fill the row.
           * Each chip gets min-w-[60px] via QuickBetPresets (see component) to
           * ensure a touchable target on mobile (WCAG 2.5.5).
           */}
          <QuickBetPresets
            selectedAmount={numericAmount}
            onSelect={handlePresetSelect}
          />

          {/* Amount input */}
          <div className="flex flex-col gap-1">
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
              /*
               * Responsive padding:
               *  px-3 py-2 on mobile — compact but comfortable (38 px height).
               *  sm:px-4 sm:py-2.5  — slightly more breathing room on ≥ 640 px.
               */
              className={[
                "w-full rounded-md border",
                "px-3 py-2 sm:px-4 sm:py-2.5",
                "text-body-sm tabular-nums",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-50",
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
        </div>

        {/*
         * ── Sticky action bar ──────────────────────────────────────────
         * `sticky bottom-0` pins it to the bottom of the form (the nearest
         * scrolling ancestor is the overflow-y-auto container above) as the
         * content scrolls beneath it. Grows a top border and shadow once the
         * body has actually been scrolled, so it reads as a distinct bar
         * floating over content rather than empty space when everything
         * already fits without scrolling.
         */}
        <div
          data-testid="betform-action-bar"
          className={[
            "sticky bottom-0 bg-background z-10 pt-3",
            bodyScrolled
              ? "border-t border-border shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.1)]"
              : "",
            reducedMotion ? "transition-none" : "transition-shadow",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="submit"
            className={[
              "w-full min-h-[44px] rounded-md",
              "px-4 py-2 sm:py-2.5",
              "text-body-sm font-semibold",
              "flex items-center justify-center gap-2",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              !reducedMotion && "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span>Place Bet</span>
            {/* Keyboard shortcut hint — hidden on narrow screens to save space */}
            <span className="hidden sm:flex items-center gap-1 opacity-80">
              <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">
                ⌘
              </KbdHint>
              <KbdHint className="bg-primary-foreground/20 text-primary-foreground border-transparent">
                ↵
              </KbdHint>
            </span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default BetForm;

// ---------------------------------------------------------------------------
// BetFormSkeleton
// ---------------------------------------------------------------------------

/**
 * BetFormSkeleton
 *
 * Skeleton placeholder that mirrors the exact layout/shape of BetForm so the
 * loading state preserves layout parity (no cumulative layout shift).
 *
 * Responsive parity: skeleton dimensions match the responsive sizes used by
 * the live BetForm so there is no jump when the skeleton swaps to the real form.
 *
 * Structure mirrors BetForm:
 *   1. Three preset chips (1 / 5 / 10 XLM) — matching QuickBetPresets dimensions
 *   2. Amount label + input
 *   3. Submit button (min-h-[44px] matching the real button)
 */
export const BetFormSkeleton: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="w-full max-w-sm mx-auto flex flex-col gap-3 sm:gap-4"
      aria-busy="true"
      data-testid="bet-form-skeleton"
    >
      {/* Preset chips — min-w-[60px] mirrors the live chips */}
      <div
        role="group"
        aria-label="Quick bet amounts"
        className="flex flex-wrap gap-2"
      >
        <Skeleton
          className="h-7 min-w-[60px] w-[70px] rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        <Skeleton
          className="h-7 min-w-[60px] w-[70px] rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        <Skeleton
          className="h-7 min-w-[60px] w-[80px] rounded-full shrink-0"
          aria-hidden="true"
          animate={!reducedMotion}
        />
      </div>

      {/* Amount label + input */}
      <div className="flex flex-col gap-1">
        <Skeleton
          className="h-5 w-24 rounded-md"
          aria-hidden="true"
          animate={!reducedMotion}
        />
        {/* Height matches px-3 py-2 input = ~38 px; sm:py-2.5 = ~42 px */}
        <Skeleton
          className="h-[38px] sm:h-[42px] w-full rounded-md border"
          aria-hidden="true"
          animate={!reducedMotion}
        />
      </div>

      {/* Submit button — min-h-[44px] matches real button */}
      <Skeleton
        className="min-h-[44px] w-full rounded-md"
        aria-hidden="true"
        animate={!reducedMotion}
      />
    </div>
  );
};