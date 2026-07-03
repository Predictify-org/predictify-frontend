/**
 * markets-widget.test.tsx
 *
 * Tests for the "You're following this" indicator rendered inside MarketCard.
 * Verifies that the badge appears only for followed markets and that the
 * SR-only text is present for screen-reader accessibility.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useFollowsStore } from "@/app/state/follows";
import { useUserLimitsStore } from "@/app/state/userLimits";

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

function resetUserLimits() {
  act(() => {
    useUserLimitsStore.setState({ limitsByMarket: {} });
  });
}

// We import the file under test AFTER mocks are in place.
const { MarketsWidget } = require("../markets-widget");

describe("MarketsWidget – following indicator", () => {
  beforeAll(() => {
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
  });

  beforeEach(() => {
    resetFollows();
    resetUserLimits();
  });

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

  it("shows remaining daily betting allowance on market cards", () => {
    act(() => {
      useUserLimitsStore.getState().setLimit("btc-price", {
        dailyLimit: 500,
        usedToday: 120,
        currency: "USDC",
      });
    });

    render(<MarketsWidget />);

    expect(screen.getByText("Daily allowance")).toBeInTheDocument();
    expect(screen.getByText("380 USDC left today")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Daily betting allowance remaining for Bitcoin Price",
      })
    ).toHaveAttribute("aria-valuenow", "76");
  });
});
