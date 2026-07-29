/**
 * hero.reduced-motion.test.tsx
 *
 * Asserts that MarketHero provides a proper static fallback when the user
 * has "prefers-reduced-motion: reduce" enabled.
 *
 * Two defence layers are tested:
 *  1. CSS layer  — `motion-reduce:transition-none` is always present on the
 *                  bar element so there is no animated flash before JS hydrates.
 *  2. JS layer   — the `useReducedMotion` hook removes the animated transition
 *                  classes at runtime, and a `data-testid` confirms which branch
 *                  is active (matches the NotificationBell pattern in this repo).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MarketHero } from "../hero";

// ---------------------------------------------------------------------------
// Mock useReducedMotion so each test can flip the preference independently.
// ---------------------------------------------------------------------------
const mockUseReducedMotion = jest.fn(() => false);
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------
const BASE_PROPS = {
  title: "Will Argentina win the 2026 FIFA World Cup?",
  status: "open" as const,
  outcomes: [
    { label: "Yes", probability: 62 },
    { label: "No", probability: 38 },
  ] as [{ label: string; probability: number }, { label: string; probability: number }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MarketHero — reduced-motion fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  // ── CSS layer (always present) ──────────────────────────────────────────

  it("CSS: probability bar always carries motion-reduce:transition-none regardless of JS preference", () => {
    // motion is allowed
    mockUseReducedMotion.mockReturnValue(false);
    render(<MarketHero {...BASE_PROPS} />);

    const bar = document.querySelector(".bg-outcome-yes");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass("motion-reduce:transition-none");
  });

  it("CSS: motion-reduce:transition-none is present even when reduced-motion is active", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<MarketHero {...BASE_PROPS} />);

    const bar = document.querySelector(".bg-outcome-yes");
    expect(bar).toHaveClass("motion-reduce:transition-none");
  });

  // ── JS layer (useReducedMotion hook) ────────────────────────────────────

  it("JS: renders animated branch (data-testid=probability-bar-animated) when motion is allowed", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<MarketHero {...BASE_PROPS} />);

    expect(screen.getByTestId("probability-bar-animated")).toBeInTheDocument();
    expect(screen.queryByTestId("probability-bar-static")).not.toBeInTheDocument();
  });

  it("JS: renders static branch (data-testid=probability-bar-static) when reduced-motion is active", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<MarketHero {...BASE_PROPS} />);

    expect(screen.getByTestId("probability-bar-static")).toBeInTheDocument();
    expect(screen.queryByTestId("probability-bar-animated")).not.toBeInTheDocument();
  });

  it("JS: static branch has no transition-* or duration-* classes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<MarketHero {...BASE_PROPS} />);

    const bar = screen.getByTestId("probability-bar-static");
    // None of the animated utility classes should be present.
    expect(bar.className).not.toMatch(/\btransition\b/);
    expect(bar.className).not.toMatch(/\bduration-/);
    expect(bar.className).not.toMatch(/\bease-/);
  });

  it("JS: animated branch carries transition, duration, and ease classes", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<MarketHero {...BASE_PROPS} />);

    const bar = screen.getByTestId("probability-bar-animated");
    expect(bar).toHaveClass("duration-500");
    expect(bar).toHaveClass("ease-out");
  });

  // ── Probability value is unchanged in both branches ─────────────────────

  it("bar width reflects the leading outcome probability in both branches", () => {
    for (const reduced of [false, true]) {
      mockUseReducedMotion.mockReturnValue(reduced);
      const { unmount } = render(<MarketHero {...BASE_PROPS} />);

      const testId = reduced ? "probability-bar-static" : "probability-bar-animated";
      const bar = screen.getByTestId(testId);
      expect(bar).toHaveStyle({ width: "62%" });

      unmount();
    }
  });

  // ── No probability bar when outcomes are absent ─────────────────────────

  it("does not render a probability bar when outcomes prop is omitted", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { title, status } = BASE_PROPS;
    render(<MarketHero title={title} status={status} />);

    expect(screen.queryByTestId("probability-bar-static")).not.toBeInTheDocument();
    expect(screen.queryByTestId("probability-bar-animated")).not.toBeInTheDocument();
  });

  // ── Transition between preferences (edge case) ──────────────────────────

  it("switches from animated to static branch when preference changes mid-session", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { rerender } = render(<MarketHero {...BASE_PROPS} />);
    expect(screen.getByTestId("probability-bar-animated")).toBeInTheDocument();

    mockUseReducedMotion.mockReturnValue(true);
    rerender(<MarketHero {...BASE_PROPS} />);
    expect(screen.getByTestId("probability-bar-static")).toBeInTheDocument();
    expect(screen.queryByTestId("probability-bar-animated")).not.toBeInTheDocument();
  });
});
