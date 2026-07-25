import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketTimeline } from "../MarketTimeline";
import { MarketEvent } from "@/types/market-timeline";

const createMockEvent = (overrides: Partial<MarketEvent> = {}): MarketEvent => ({
  id: "test-1",
  eventType: "market_created",
  timestamp: new Date(),
  title: "Test Market Event",
  description: "A test event description",
  ...overrides,
});

describe("MarketTimeline", () => {
  describe("Rendering", () => {
    it("renders with default mock data", () => {
      render(<MarketTimeline />);
      expect(screen.getByText(/market created/i)).toBeInTheDocument();
    });

    it("renders with provided events", () => {
      const events = [createMockEvent({ id: "1", title: "Custom Event" })];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText("Custom Event")).toBeInTheDocument();
    });

    it("renders empty state when no events", () => {
      render(<MarketTimeline events={[]} />);
      expect(
        screen.getByText(/no timeline events yet/i)
      ).toBeInTheDocument();
    });

    it("renders loading state", () => {
      const { container } = render(<MarketTimeline isLoading />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("renders error state with message", () => {
      render(<MarketTimeline error="Network error" events={[]} />);
      expect(screen.getByText(/failed to load timeline/i)).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  describe("Event Display", () => {
    it("displays event title and description", () => {
      const events = [
        createMockEvent({
          id: "1",
          title: "Market Opened",
          description: "Market is now live",
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText("Market Opened")).toBeInTheDocument();
      expect(screen.getByText("Market is now live")).toBeInTheDocument();
    });

    it("displays amount and currency for financial events", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "liquidity_added",
          title: "Liquidity Added",
          amount: 10000,
          currency: "USDC",
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText("10,000 USDC")).toBeInTheDocument();
    });

    it("displays user address when present", () => {
      const events = [
        createMockEvent({
          id: "1",
          title: "Prediction Placed",
          user: "0xabc...def",
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText(/0xabc...def/)).toBeInTheDocument();
    });

    it("formats relative timestamps", () => {
      const events = [
        createMockEvent({
          id: "1",
          timestamp: new Date(),
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it("shows event type icon for each event", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "market_created",
          title: "Market Created",
        }),
        createMockEvent({
          id: "2",
          eventType: "market_opened",
          title: "Market Opened",
        }),
        createMockEvent({
          id: "3",
          eventType: "market_closed",
          title: "Market Closed",
        }),
      ];
      const { container } = render(<MarketTimeline events={events} />);
      const circles = container.querySelectorAll(".rounded-full");
      expect(circles.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Date Grouping", () => {
    it("groups events by date", () => {
      const events = [
        createMockEvent({
          id: "1",
          title: "Recent Event",
          timestamp: new Date(),
        }),
        createMockEvent({
          id: "2",
          title: "Older Event",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });

    it("shows collapsed state for groups with many events", () => {
      const events = Array.from({ length: 6 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i + 1}`,
          timestamp: new Date(),
        })
      );
      render(<MarketTimeline events={events} />);
      expect(screen.getByText(/show all 6/i)).toBeInTheDocument();
    });

    it("expands collapsed group on click", () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i + 1}`,
          timestamp: new Date(),
        })
      );
      render(<MarketTimeline events={events} />);
      const showAllButton = screen.getByText(/show all 5/i);
      fireEvent.click(showAllButton);
      expect(screen.getByText(/show less/i)).toBeInTheDocument();
    });
  });

  describe("Load More", () => {
    it("shows load more button when hasMore is true", () => {
      render(
        <MarketTimeline
          events={[createMockEvent({ id: "1" })]}
          hasMore
          onLoadMore={jest.fn()}
        />
      );
      expect(
        screen.getByRole("button", { name: /load older events/i })
      ).toBeInTheDocument();
    });

    it("calls onLoadMore when clicked", () => {
      const onLoadMore = jest.fn();
      render(
        <MarketTimeline
          events={[createMockEvent({ id: "1" })]}
          hasMore
          onLoadMore={onLoadMore}
        />
      );
      fireEvent.click(
        screen.getByRole("button", { name: /load older events/i })
      );
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("does not show load more when hasMore is false", () => {
      render(
        <MarketTimeline
          events={[createMockEvent({ id: "1" })]}
          hasMore={false}
          onLoadMore={jest.fn()}
        />
      );
      expect(
        screen.queryByRole("button", { name: /load older events/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing description gracefully", () => {
      const events = [
        createMockEvent({
          id: "1",
          title: "Event without description",
          description: undefined,
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(
        screen.getByText("Event without description")
      ).toBeInTheDocument();
    });

    it("handles missing amount gracefully", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "market_resolved",
          title: "Market Resolved",
          amount: undefined,
          currency: undefined,
        }),
      ];
      render(<MarketTimeline events={events} />);
      expect(screen.getByText("Market Resolved")).toBeInTheDocument();
    });

    it("handles empty event array gracefully", () => {
      render(<MarketTimeline events={[]} />);
      expect(
        screen.getByText(/no timeline events yet/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Design token compliance (v7)
  // -------------------------------------------------------------------------
  describe("Design token compliance (v7)", () => {
    it("event title uses text-body-sm token class (not bare text-sm)", () => {
      const events = [
        createMockEvent({ id: "1", title: "Token Test Event" }),
      ];
      const { container } = render(<MarketTimeline events={events} />);
      // The event title paragraph should carry the design token class
      const titleEl = screen.getByText("Token Test Event");
      expect(titleEl).toHaveClass("text-body-sm");
      expect(titleEl).not.toHaveClass("text-sm");
    });

    it("event description uses text-caption token class (not bare text-xs)", () => {
      const events = [
        createMockEvent({
          id: "1",
          title: "Event",
          description: "Token description test",
        }),
      ];
      render(<MarketTimeline events={events} />);
      const descEl = screen.getByText("Token description test");
      expect(descEl).toHaveClass("text-caption");
      expect(descEl).not.toHaveClass("text-xs");
    });

    it("timestamp uses text-caption token class (not bare text-xs)", () => {
      const events = [createMockEvent({ id: "1", timestamp: new Date() })];
      const { container } = render(<MarketTimeline events={events} />);
      const timeEl = container.querySelector("time");
      expect(timeEl).toHaveClass("text-caption");
      expect(timeEl).not.toHaveClass("text-xs");
    });

    it("date group header uses text-caption token class (not bare text-sm)", () => {
      const events = [createMockEvent({ id: "1", timestamp: new Date() })];
      const { container } = render(<MarketTimeline events={events} />);
      // Group header is an h3
      const groupHeader = container.querySelector("h3");
      expect(groupHeader).toHaveClass("text-caption");
      expect(groupHeader).not.toHaveClass("text-sm");
    });

    it("amount badge for payouts_distributed uses bg-outcome-yes/10 and text-outcome-yes (not bare green classes)", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "payouts_distributed",
          title: "Payouts Distributed",
          amount: 5000,
          currency: "USDC",
        }),
      ];
      const { container } = render(<MarketTimeline events={events} />);
      const badge = screen.getByText("5,000 USDC");
      expect(badge).toHaveClass("text-outcome-yes");
      // Must NOT use bare green classes
      expect(badge).not.toHaveClass("text-green-700");
      expect(badge).not.toHaveClass("bg-green-100");
    });

    it("amount badge for liquidity_added uses chart-2 token (not bare blue classes)", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "liquidity_added",
          title: "Liquidity Added",
          amount: 2500,
          currency: "USDC",
        }),
      ];
      render(<MarketTimeline events={events} />);
      const badge = screen.getByText("2,500 USDC");
      expect(badge).toHaveClass("text-chart-2");
      // Must NOT use bare blue classes
      expect(badge).not.toHaveClass("text-blue-700");
      expect(badge).not.toHaveClass("bg-blue-100");
    });

    it("amount badge uses text-caption token class (not bare text-xs)", () => {
      const events = [
        createMockEvent({
          id: "1",
          eventType: "liquidity_added",
          title: "Liquidity Added",
          amount: 1000,
          currency: "USDC",
        }),
      ];
      render(<MarketTimeline events={events} />);
      const badge = screen.getByText("1,000 USDC");
      expect(badge).toHaveClass("text-caption");
      expect(badge).not.toHaveClass("text-xs");
    });

    it("empty state title uses text-h3 token class (not bare text-lg)", () => {
      const { container } = render(<MarketTimeline events={[]} />);
      const emptyTitle = screen.getByText(/no timeline events yet/i);
      expect(emptyTitle).toHaveClass("text-h3");
      expect(emptyTitle).not.toHaveClass("text-lg");
    });

    it("empty state description uses text-body-sm token class (not bare text-sm)", () => {
      render(<MarketTimeline events={[]} />);
      const emptyDesc = screen.getByText(/market events will appear here/i);
      expect(emptyDesc).toHaveClass("text-body-sm");
      expect(emptyDesc).not.toHaveClass("text-sm");
    });

    it("error state title uses text-h3 token class (not bare text-lg)", () => {
      render(<MarketTimeline error="Failed" events={[]} />);
      const errorTitle = screen.getByText(/failed to load timeline/i);
      expect(errorTitle).toHaveClass("text-h3");
      expect(errorTitle).not.toHaveClass("text-lg");
    });

    it("error state description uses text-body-sm token class (not bare text-sm)", () => {
      render(<MarketTimeline error="Network timeout" events={[]} />);
      const errorDesc = screen.getByText("Network timeout");
      expect(errorDesc).toHaveClass("text-body-sm");
      expect(errorDesc).not.toHaveClass("text-sm");
    });
  });
});
