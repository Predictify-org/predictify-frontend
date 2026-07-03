/**
 * markets-widget.test.tsx
 *
 * Tests for the "You're following this" indicator rendered inside MarketCard.
 * Verifies that the badge appears only for followed markets and that the
 * SR-only text is present for screen-reader accessibility.
 */

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useFollowsStore } from "@/app/state/follows";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ── minimal stub for the Card component ─────────────────────────────────────
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className, style }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => (
    <div className={className} style={style}>{children}</div>
  ),
}));

// ── helper: reset follows store between tests ────────────────────────────────
function resetFollows() {
  act(() => {
    useFollowsStore.setState({ followedIds: new Set() });
  });
}

// We import the file under test AFTER mocks are in place.
const { MarketsWidget } = require("../markets-widget");

describe("MarketsWidget – following indicator", () => {
  beforeEach(resetFollows);

  it("does not show any following indicator when no markets are followed", () => {
    render(<MarketsWidget />);
    expect(screen.queryByTestId("following-indicator")).toBeNull();
  });

  it("shows the indicator for a followed market", () => {
    // Follow the first sample market id
    act(() => {
      useFollowsStore.getState().follow("btc-price");
    });

    render(<MarketsWidget />);

    const indicators = screen.getAllByTestId("following-indicator");
    expect(indicators.length).toBeGreaterThanOrEqual(1);
    // Visible label
    expect(indicators[0]).toHaveTextContent("You're following this");
    // SR-only reinforcement text
    expect(indicators[0]).toHaveTextContent("you are following this market");
  });

  it("does not show the indicator on a market the user does not follow", () => {
    // Only follow one market
    act(() => {
      useFollowsStore.getState().follow("btc-price");
    });

    render(<MarketsWidget />);

    // There should be exactly one indicator (not one per card)
    const indicators = screen.getAllByTestId("following-indicator");
    expect(indicators).toHaveLength(1);
  });
});

describe("MarketsWidget – accessible market tooltips", () => {
  beforeEach(() => {
    resetFollows();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows pool details after the hover delay and links the trigger with aria-describedby", () => {
    jest.useFakeTimers();
    render(<MarketsWidget />);

    const trigger = screen.getByTestId("market-btc-price-pool-trigger");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("1,245 USDC has been committed");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and closes with Escape", () => {
    render(<MarketsWidget />);

    const trigger = screen.getByTestId("market-btc-price-yes-trigger");
    fireEvent.focus(trigger);

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Current implied probability for the Yes outcome",
    );

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("supports touch long-press without opening before the configured delay", () => {
    jest.useFakeTimers();
    render(<MarketsWidget />);

    const trigger = screen.getByTestId("market-btc-price-ends-trigger");
    fireEvent.touchStart(trigger);

    act(() => {
      jest.advanceTimersByTime(599);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Approximate time remaining",
    );

    fireEvent.touchEnd(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
