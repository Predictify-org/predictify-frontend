/**
 * markets-widget.test.tsx
 *
 * Tests for the "You're following this" indicator rendered inside MarketCard.
 * Verifies that the badge appears only for followed markets and that the
 * SR-only text is present for screen-reader accessibility.
 */

import React from "react";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { useFollowsStore } from "@/app/state/follows";
import { useBookmarksStore } from "@/app/state/bookmarks";

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

function resetBookmarks() {
  act(() => {
    useBookmarksStore.setState({ bookmarkedIds: new Set() });
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
    resetBookmarks();
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

  it("lets users save markets and review the saved list from the widget header", () => {
    render(<MarketsWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Save Bitcoin Price for later" }));

    expect(screen.getByRole("button", { name: "Remove Bitcoin Price from saved markets" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const savedHeaderButton = screen.getByRole("button", { name: "Saved markets, 1 saved" });
    expect(savedHeaderButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(savedHeaderButton);

    expect(savedHeaderButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Saved: Bitcoin Price")).toBeInTheDocument();
  });
});
