/**
 * markets-widget-tooltip.test.tsx
 *
 * Tests for tooltip integration in the MarketCard component within the MarketsWidget.
 * Verifies that tooltips appear correctly for market information elements.
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MarketsWidget } from "../markets-widget";

/**
 * Mock matchMedia for Radix UI and responsive behavior
 */
function mockMatchMedia() {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

/**
 * Mock zustand stores
 */
jest.mock("@/app/state/follows", () => ({
  useFollowsStore: jest.fn((selector) => {
    const store = {
      isFollowing: jest.fn((id: string) => id === "btc-price"),
    };
    return selector(store);
  }),
}));

jest.mock("@/app/state/userLimits", () => ({
  useUserLimitsStore: jest.fn((selector) => {
    const store = {
      getRemainingDailyAllowance: jest.fn(() => 100),
    };
    return selector(store);
  }),
}));

describe("MarketCard Tooltip Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia();
  });

  describe("tooltip triggers", () => {
    it("renders market card with tooltip-enabled elements", () => {
      render(<MarketsWidget />);

      // Check that cursor-help class is applied to tooltip triggers
      const poolElements = screen.getAllByText(/Pool:/i);
      expect(poolElements.length).toBeGreaterThan(0);
      expect(poolElements[0]).toHaveClass("cursor-help");
    });

    it("Yes odds tooltip appears on focus", async () => {
      render(<MarketsWidget />);

      // Find a Yes odds element (there are multiple in the widget)
      const yesOdds = screen.getAllByText(/Yes:/i)[0];

      // Focus the element
      act(() => {
        yesOdds.focus();
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /current probability that this outcome will occur/i,
          })
        ).toBeInTheDocument();
      });
    });

    it("No odds tooltip appears on focus", async () => {
      render(<MarketsWidget />);

      // Find a No odds element
      const noOdds = screen.getAllByText(/No:/i)[0];

      // Focus the element
      act(() => {
        noOdds.focus();
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /current probability that this outcome will not occur/i,
          })
        ).toBeInTheDocument();
      });
    });

    it("Pool amount tooltip appears on focus", async () => {
      render(<MarketsWidget />);

      // Find pool amount element
      const poolElement = screen.getAllByText(/Pool:/i)[0];

      // Focus the element
      act(() => {
        poolElement.focus();
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /total liquidity in this market/i,
          })
        ).toBeInTheDocument();
      });
    });

    it("Ends in tooltip appears on focus", async () => {
      render(<MarketsWidget />);

      // Find "Ends in" element
      const endsInElement = screen.getAllByText(/Ends in/i)[0];

      // Focus the element
      act(() => {
        endsInElement.focus();
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /time remaining until this market closes/i,
          })
        ).toBeInTheDocument();
      });
    });

    it("Daily betting allowance tooltip appears on focus", async () => {
      render(<MarketsWidget />);

      // Find betting allowance element
      const allowanceElement = screen.getByText(/Daily betting allowance remaining/i);

      // Focus the element
      act(() => {
        allowanceElement.focus();
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /remaining daily betting limit for this market/i,
          })
        ).toBeInTheDocument();
      });
    });

    it("Following bell icon tooltip appears on focus when market is followed", async () => {
      render(<MarketsWidget />);

      // Find the following indicator (only appears for followed markets)
      const followingIndicator = screen.getByTestId("following-indicator");
      expect(followingIndicator).toBeInTheDocument();

      // Find the bell icon within the indicator
      const bellIcon = followingIndicator.querySelector('svg');
      expect(bellIcon).toBeInTheDocument();

      // Focus the bell icon's wrapper
      act(() => {
        if (bellIcon && bellIcon.parentElement) {
          bellIcon.parentElement.focus();
        }
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(
          screen.getByRole("tooltip", {
            name: /you will receive notifications when this market has significant updates/i,
          })
        ).toBeInTheDocument();
      });
    });
  });

  describe("tooltip content", () => {
    it("provides contextual information for odds", async () => {
      render(<MarketsWidget />);

      const yesOdds = screen.getAllByText(/Yes:/i)[0];

      act(() => {
        yesOdds.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("Current probability that this outcome will occur");
        expect(tooltip).toHaveTextContent("based on market trading activity");
      });
    });

    it("explains pool amount liquidity", async () => {
      render(<MarketsWidget />);

      const poolElement = screen.getAllByText(/Pool:/i)[0];

      act(() => {
        poolElement.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("Total liquidity in this market");
        expect(tooltip).toHaveTextContent("Higher pools typically mean more accurate odds");
      });
    });

    it("clarifies time-remaining information", async () => {
      render(<MarketsWidget />);

      const endsInElement = screen.getAllByText(/Ends in/i)[0];

      act(() => {
        endsInElement.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("Time remaining until this market closes");
        expect(tooltip).toHaveTextContent("no new predictions can be placed");
      });
    });

    it("explains daily betting allowance limits", async () => {
      render(<MarketsWidget />);

      const allowanceElement = screen.getByText(/Daily betting allowance remaining/i);

      act(() => {
        allowanceElement.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("remaining daily betting limit for this market");
        expect(tooltip).toHaveTextContent("responsible prediction market participation");
      });
    });
  });

  describe("accessibility", () => {
    it("all tooltip triggers have cursor-help styling", () => {
      render(<MarketsWidget />);

      // Find elements with cursor-help class
      const helpElements = document.querySelectorAll(".cursor-help");
      expect(helpElements.length).toBeGreaterThan(0);
    });

    it("tooltip dismisses when focus moves away", async () => {
      render(<MarketsWidget />);

      const yesOdds = screen.getAllByText(/Yes:/i)[0];
      const noOdds = screen.getAllByText(/No:/i)[0];

      // Focus first element
      act(() => {
        yesOdds.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Focus second element
      act(() => {
        noOdds.focus();
      });

      // First tooltip should be gone, second should appear
      await waitFor(() => {
        const tooltips = screen.getAllByRole("tooltip");
        expect(tooltips).toHaveLength(1);
        expect(tooltips[0]).toHaveTextContent(/will not occur/i);
      });
    });

    it("tooltips work with keyboard navigation", async () => {
      render(<MarketsWidget />);

      // Get all focusable tooltip triggers in the first market card
      const triggers = screen.getAllByText(/Yes:/i);

      // Focus first trigger
      act(() => {
        triggers[0].focus();
      });

      // Should show tooltip
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Blur
      act(() => {
        (triggers[0] as HTMLElement).blur();
      });

      // Tooltip should dismiss
      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });
  });

  describe("does not break existing functionality", () => {
    it("renders following indicator for followed markets", () => {
      render(<MarketsWidget />);

      const followingIndicator = screen.getByTestId("following-indicator");
      expect(followingIndicator).toBeInTheDocument();
      expect(followingIndicator).toHaveTextContent("You're following this");
    });

    it("displays sparkline", () => {
      render(<MarketsWidget />);

      // Sparkline should be present with testid
      const sparkline = screen.getAllByTestId(/sparkline-/i)[0];
      expect(sparkline).toBeInTheDocument();
    });

    it("shows betting limit nudge", () => {
      render(<MarketsWidget />);

      const bettingLimitElement = screen.getByTestId("betting-limit-nudge");
      expect(bettingLimitElement).toBeInTheDocument();
      expect(bettingLimitElement).toHaveTextContent("100 USDC");
    });

    it("maintains card layout structure", () => {
      render(<MarketsWidget />);

      // Check that key market information is still displayed
      expect(screen.getAllByText(/Yes:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/No:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pool:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Ends in/i).length).toBeGreaterThan(0);
    });
  });
});
