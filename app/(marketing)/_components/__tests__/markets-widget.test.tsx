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
  Card: ({
    children,
    className,
    style,
  }: React.PropsWithChildren<{
    className?: string;
    style?: React.CSSProperties;
  }>) => (
    <div className={className} style={style}>
      {children}
    </div>
  ),
}));

// ── helper: reset follows store between tests ────────────────────────────────
function resetFollows() {
  act(() => {
    useFollowsStore.setState({ followedIds: new Set() });
    useUserLimitsStore.setState({
      remainingDailyAllowance: {
        "btc-price": 120,
        "us-election": 240,
        "tesla-earnings": 90,
      },
    });
  });
}

// We import the file under test AFTER mocks are in place.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MarketsWidget } = require("../markets-widget");

describe("MarketsWidget – following indicator", () => {
  beforeEach(resetFollows);

  it("does not show any following indicator when no markets are followed", () => {
    render(<MarketsWidget />);
    expect(screen.queryByTestId("following-indicator")).toBeNull();
  });

  it("shows the indicator for a followed market", () => {
    act(() => {
      useFollowsStore.getState().follow("btc-price");
    });

    render(<MarketsWidget />);

    const indicators = screen.getAllByTestId("following-indicator");
    expect(indicators.length).toBeGreaterThanOrEqual(1);
    expect(indicators[0]).toHaveTextContent("You're following this");
    expect(indicators[0]).toHaveTextContent("you are following this market");
  });

  it("shows the daily allowance nudge for each market card", () => {
    render(<MarketsWidget />);

    const nudges = screen.getAllByTestId("betting-limit-nudge");
    expect(nudges).toHaveLength(3);
    expect(nudges[0]).toHaveTextContent("Daily betting allowance remaining:");
    expect(nudges[0]).toHaveTextContent("120 USDC");
  });

  it("updates the nudge when the allowance is changed in store", () => {
    act(() => {
      useUserLimitsStore.getState().setRemainingDailyAllowance("btc-price", 45);
    });

    render(<MarketsWidget />);

    const firstNudge = screen.getAllByTestId("betting-limit-nudge")[0];
    expect(firstNudge).toHaveTextContent("45 USDC");
  });

  it("does not show the indicator on a market the user does not follow", () => {
    act(() => {
      useFollowsStore.getState().follow("btc-price");
    });

    render(<MarketsWidget />);

    const indicators = screen.getAllByTestId("following-indicator");
    expect(indicators).toHaveLength(1);
  });
});
