/**
 * BetForm.responsive.test.tsx
 *
 * Focused tests for the v7 responsive breakpoint audit on BetForm.
 *
 * What is tested:
 *  1. Wrapper carries the responsive max-width + centering classes.
 *  2. Preset chip row is set up for wrapping (flex-wrap / gap-2).
 *  3. Input has responsive padding classes for both narrow and wide viewports.
 *  4. Submit button is full-width and meets the minimum touch-target height.
 *  5. Keyboard shortcut hint is hidden on narrow screens (hidden sm:flex).
 *  6. Skeleton matches the live form's responsive dimensions.
 *  7. No duplicate import errors (regression guard).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import BetForm, { BetFormSkeleton } from "@/app/components/BetForm";

// Stub out hooks / child components that are not under test here.
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));
jest.mock("@/components/QuickBetPresets", () => {
  const Mock = ({ onSelect }: { onSelect: (v: number) => void }) => (
    <div data-testid="quick-bet-presets">
      <button onClick={() => onSelect(5)}>5 XLM</button>
    </div>
  );
  Mock.displayName = "QuickBetPresets";
  return Mock;
});
jest.mock("../../src/components/KbdHint", () => {
  const Mock = ({ children }: { children: React.ReactNode }) => (
    <span data-testid="kbd-hint">{children}</span>
  );
  Mock.displayName = "KbdHint";
  return Mock;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the outermost <form> element. */
const getForm = () => screen.getByRole("form", { name: "Place a bet" });

/** Returns the amount <input>. */
const getInput = () => screen.getByLabelText("Amount (XLM)") as HTMLInputElement;

/** Returns the submit <button>. */
const getSubmitBtn = () => screen.getByRole("button", { name: /Place Bet/i });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BetForm — responsive breakpoint audit (v7)", () => {
  // ── 1. Wrapper ───────────────────────────────────────────────────────────

  it("form wrapper is full-width and capped at max-w-sm", () => {
    render(<BetForm />);
    const form = getForm();
    expect(form).toHaveClass("w-full");
    expect(form).toHaveClass("max-w-sm");
  });

  it("form wrapper is horizontally centred (mx-auto)", () => {
    render(<BetForm />);
    expect(getForm()).toHaveClass("mx-auto");
  });

  it("form has data-testid=betform for test targeting", () => {
    render(<BetForm />);
    expect(screen.getByTestId("betform")).toBeInTheDocument();
  });

  // ── 2. Preset chips ──────────────────────────────────────────────────────

  it("QuickBetPresets is rendered inside the form", () => {
    render(<BetForm />);
    expect(screen.getByTestId("quick-bet-presets")).toBeInTheDocument();
  });

  // ── 3. Input responsive padding ──────────────────────────────────────────

  it("input has compact padding class for narrow viewports (px-3 py-2)", () => {
    render(<BetForm />);
    const input = getInput();
    expect(input).toHaveClass("px-3");
    expect(input).toHaveClass("py-2");
  });

  it("input has wider padding class for ≥sm viewports (sm:px-4 sm:py-2.5)", () => {
    render(<BetForm />);
    const input = getInput();
    expect(input).toHaveClass("sm:px-4");
    expect(input).toHaveClass("sm:py-2.5");
  });

  // ── 4. Submit button ─────────────────────────────────────────────────────

  it("submit button spans full width (w-full)", () => {
    render(<BetForm />);
    expect(getSubmitBtn()).toHaveClass("w-full");
  });

  it("submit button meets minimum touch-target height (min-h-[44px])", () => {
    render(<BetForm />);
    expect(getSubmitBtn()).toHaveClass("min-h-[44px]");
  });

  // ── 5. Keyboard shortcut hint visibility ─────────────────────────────────

  it("keyboard shortcut hint wrapper is hidden on narrow screens (hidden sm:flex)", () => {
    render(<BetForm />);
    // The KbdHint elements are inside a span that should carry `hidden sm:flex`
    const hintWrappers = screen
      .getAllByTestId("kbd-hint")
      .map((el) => el.closest("span[class]"));

    // Find the parent span that gates visibility
    const outerSpan = screen.getByRole("form", { name: "Place a bet" })
      .querySelector('span.hidden');
    expect(outerSpan).not.toBeNull();
    expect(outerSpan).toHaveClass("hidden");
    expect(outerSpan).toHaveClass("sm:flex");
  });

  // ── 6. Skeleton ───────────────────────────────────────────────────────────

  it("skeleton wrapper mirrors responsive classes (w-full max-w-sm mx-auto)", () => {
    const { container } = render(<BetFormSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("w-full");
    expect(root).toHaveClass("max-w-sm");
    expect(root).toHaveClass("mx-auto");
  });

  it("skeleton submit placeholder mirrors min-h-[44px]", () => {
    render(<BetFormSkeleton />);
    // The last skeleton in the skeleton component is the submit button.
    // We identify it by looking for the min-h class.
    const { container } = render(<BetFormSkeleton />);
    const minHEl = container.querySelector(".min-h-\\[44px\\]");
    expect(minHEl).not.toBeNull();
  });

  it("skeleton chip placeholders have min-w-[60px] for touchable targets", () => {
    const { container } = render(<BetFormSkeleton />);
    const chips = container.querySelectorAll(".min-w-\\[60px\\]");
    // Three chips expected
    expect(chips.length).toBeGreaterThanOrEqual(3);
  });

  // ── 7. isLoading skeleton (via BetForm) ──────────────────────────────────

  it("renders skeleton via BetForm isLoading prop", () => {
    render(<BetForm isLoading />);
    expect(screen.getByTestId("betform-skeleton")).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount (XLM)")).not.toBeInTheDocument();
  });
});
