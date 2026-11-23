import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MarketActivityFeed } from "../MarketActivityFeed";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MarketActivityEvent, MarketActivityPage } from "@/lib/stellar/market-activity";

// Mock @tanstack/react-virtual
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: jest.fn(),
}));

const mockedUseVirtualizer = useVirtualizer as jest.Mock;

describe("MarketActivityFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default virtualizer mock: renders whatever count is given up to 10 items
    mockedUseVirtualizer.mockImplementation(({ count }: { count: number }) => {
      const visibleCount = Math.min(count, 10);
      return {
        getTotalSize: () => count * 72,
        getVirtualItems: () =>
          Array.from({ length: visibleCount }, (_, index) => ({
            index,
            key: `virtual-row-${index}`,
            size: 72,
            start: index * 72,
          })),
      };
    });
  });

  const mockEvents: MarketActivityEvent[] = [
    {
      id: "ev-1",
      type: "bet",
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      amount: "100",
      outcome: "Yes",
      ledgerClosedAt: "2026-11-20T10:00:00Z",
      txHash: "tx-1",
    },
    {
      id: "ev-2",
      type: "claim",
      address: "GAYOLLLUI435Y2CFP6327IA6A5G5J75E74G23W4G4",
      amount: "250.5",
      outcome: "Yes",
      ledgerClosedAt: "2026-11-20T11:00:00Z",
      txHash: "tx-2",
    },
    {
      id: "ev-3",
      type: "dispute",
      address: "GCZNM35J37F64XQ33X5D53W647573H",
      // amount missing - test edge case
      outcome: "Invalid",
      ledgerClosedAt: "2026-11-20T12:00:00Z",
      txHash: "tx-3",
    },
  ];

  it("renders loading skeleton while initial data is fetching", () => {
    // A fetcher that never resolves immediately
    const slowFetcher = () => new Promise<MarketActivityPage>(() => {});

    render(<MarketActivityFeed marketId="market-1" fetcher={slowFetcher} />);

    expect(screen.getByTestId("market-activity-skeleton")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading activity feed")).toBeInTheDocument();
  });

  it("renders empty state when market has 0 events", async () => {
    const emptyFetcher = jest.fn().mockResolvedValue({
      events: [],
      nextCursor: null,
    });

    render(<MarketActivityFeed marketId="market-empty" fetcher={emptyFetcher} />);

    await waitFor(() => {
      expect(screen.getByTestId("market-activity-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders error state and retries on button click", async () => {
    let callCount = 0;
    const retryableFetcher = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("RPC Connection Timeout"));
      }
      return Promise.resolve({
        events: [mockEvents[0]],
        nextCursor: null,
      });
    });

    render(<MarketActivityFeed marketId="market-retry" fetcher={retryableFetcher} />);

    // First: error state
    await waitFor(() => {
      expect(screen.getByTestId("market-activity-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/RPC Connection Timeout/)).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    // After retry: renders event
    await waitFor(() => {
      expect(screen.getByTestId("market-activity-feed")).toBeInTheDocument();
    });
    expect(screen.getByText("100 XLM")).toBeInTheDocument();
  });

  it("renders feed with accessibility semantics and formatted rows", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      events: mockEvents,
      nextCursor: null,
    });

    render(<MarketActivityFeed marketId="market-success" fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByTestId("market-activity-feed")).toBeInTheDocument();
    });

    const feed = screen.getByRole("feed");
    expect(feed).toBeInTheDocument();
    expect(feed).toHaveAttribute("aria-busy", "false");

    // Check row articles and aria-posinset / aria-setsize
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);

    expect(articles[0]).toHaveAttribute("aria-posinset", "1");
    expect(articles[0]).toHaveAttribute("aria-setsize", "3");

    // Check type indicators
    expect(screen.getByText("Bet")).toBeInTheDocument();
    expect(screen.getByText("Claim")).toBeInTheDocument();
    expect(screen.getByText("Dispute")).toBeInTheDocument();

    // Check amounts (including '-' for missing amount)
    expect(screen.getByText("100 XLM")).toBeInTheDocument();
    expect(screen.getByText("250.5 XLM")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();

    // End of list note
    expect(screen.getByText("End of on-chain activity")).toBeInTheDocument();
  });

  it("deduplicates events across pages when next page returns existing event", async () => {
    const duplicateEvent = mockEvents[0]; // ev-1
    const newPageEvent: MarketActivityEvent = {
      id: "ev-4",
      type: "bet",
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      amount: "50",
      ledgerClosedAt: "2026-11-20T13:00:00Z",
      txHash: "tx-4",
    };

    const fetcher = jest.fn().mockImplementation(({ cursor }) => {
      if (!cursor) {
        return Promise.resolve({
          events: [mockEvents[0], mockEvents[1]],
          nextCursor: "cursor-pg2",
        });
      }
      return Promise.resolve({
        // Returns ev-1 again (duplicate) + ev-4
        events: [duplicateEvent, newPageEvent],
        nextCursor: null,
      });
    });

    render(<MarketActivityFeed marketId="market-dedupe" fetcher={fetcher} />);

    // Page 2 loads and deduplication preserves uniqueness
    await waitFor(() => {
      expect(screen.getByText("50 XLM")).toBeInTheDocument();
    });

    // Verify articles count is 3 (ev-1, ev-2, ev-4), NOT 4 (no duplicate ev-1)
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
  });

  it("renders manual load-more button and appends items on click when not scrolled to end", async () => {
    // Return 20 items so virtualizer (visibleCount 5) is far from the end
    const firstPageItems: MarketActivityEvent[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p1-${i}`,
      type: "bet" as const,
      address: `GADDR${i}`,
      amount: "10",
      ledgerClosedAt: "2026-11-20T10:00:00Z",
      txHash: `tx-${i}`,
    }));

    const nextPageItem: MarketActivityEvent = {
      id: "p2-99",
      type: "claim" as const,
      address: "GPAGE2NEW",
      amount: "777",
      ledgerClosedAt: "2026-11-20T11:00:00Z",
      txHash: "tx-99",
    };

    // Only 5 items visible in viewport (indexes 0 to 4), so lastItem.index is 4 (< 18)
    mockedUseVirtualizer.mockImplementation(({ count }: { count: number }) => ({
      getTotalSize: () => count * 72,
      getVirtualItems: () =>
        Array.from({ length: Math.min(count, 5) }, (_, index) => ({
          index,
          key: `virtual-row-${index}`,
          size: 72,
          start: index * 72,
        })),
    }));

    const fetcher = jest.fn().mockImplementation(({ cursor }) => {
      if (!cursor) {
        return Promise.resolve({
          events: firstPageItems,
          nextCursor: "cursor-pg2",
        });
      }
      return Promise.resolve({
        events: [nextPageItem],
        nextCursor: null,
      });
    });

    render(<MarketActivityFeed marketId="market-manual-load" fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByTestId("load-more-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("load-more-btn"));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "cursor-pg2" })
      );
    });
  });

  it("handles market ID switch mid-request without leaking stale market data", async () => {
    let resolveMarket1: (val: MarketActivityPage) => void;
    const fetcher = jest.fn().mockImplementation(({ marketId }) => {
      if (marketId === "market-first") {
        return new Promise<MarketActivityPage>((resolve) => {
          resolveMarket1 = resolve;
        });
      }
      return Promise.resolve({
        events: [
          {
            id: "m2-ev-1",
            type: "bet",
            address: "GMARKET2ADDRESS",
            amount: "999",
            ledgerClosedAt: "2026-11-20T15:00:00Z",
            txHash: "tx-m2",
          },
        ],
        nextCursor: null,
      });
    });

    const { rerender } = render(
      <MarketActivityFeed marketId="market-first" fetcher={fetcher} />
    );

    // Switch market before market-first resolves
    rerender(<MarketActivityFeed marketId="market-second" fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByText("999 XLM")).toBeInTheDocument();
    });

    // Resolve old market-first late
    if (resolveMarket1!) {
      resolveMarket1({
        events: [
          {
            id: "stale-ev",
            type: "claim",
            address: "GSTALE",
            amount: "111",
            ledgerClosedAt: "2026-11-20T10:00:00Z",
            txHash: "tx-stale",
          },
        ],
        nextCursor: null,
      });
    }

    // Stale event should not appear
    expect(screen.queryByText("111 XLM")).not.toBeInTheDocument();
    expect(screen.getByText("999 XLM")).toBeInTheDocument();
  });

  it("renders only visible rows for 1,000 items according to virtualizer window", async () => {
    // Generate 1,000 events
    const thousandEvents: MarketActivityEvent[] = Array.from(
      { length: 1000 },
      (_, i) => ({
        id: `bulk-evt-${i}`,
        type: (i % 2 === 0 ? "bet" : "claim") as const,
        address: `GBULK${i}ADDRESS`,
        amount: String(i + 1),
        ledgerClosedAt: "2026-11-20T10:00:00Z",
        txHash: `tx-bulk-${i}`,
      })
    );

    // Configure virtualizer to simulate a viewport displaying only 6 items
    mockedUseVirtualizer.mockImplementation(({ count }: { count: number }) => ({
      getTotalSize: () => count * 72,
      getVirtualItems: () =>
        Array.from({ length: 6 }, (_, index) => ({
          index,
          key: `virtual-row-${index}`,
          size: 72,
          start: index * 72,
        })),
    }));

    const fetcher = jest.fn().mockResolvedValue({
      events: thousandEvents,
      nextCursor: null,
    });

    render(<MarketActivityFeed marketId="market-1000" fetcher={fetcher} />);

    await waitFor(() => {
      expect(screen.getByTestId("market-activity-feed")).toBeInTheDocument();
    });

    // Despite 1,000 events total, only 6 rows are in DOM
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(6);
    expect(articles[0]).toHaveAttribute("aria-posinset", "1");
    expect(articles[0]).toHaveAttribute("aria-setsize", "1000");
  });
});
