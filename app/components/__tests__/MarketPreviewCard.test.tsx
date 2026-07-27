import React from "react";
import "@testing-library/jest-dom";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useFollowsStore } from "../../state/follows";
import { useUserLimitsStore } from "../../state/userLimits";
import type { Market } from "../../../content/markets.sample";
import { MarketPreviewCard } from "../MarketPreviewCard";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, className, ...rest }: any) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
});

// Mock HeatStrip & Sparkline to avoid heavy SVG rendering issues in jest
jest.mock("../HeatStrip", () => ({
  HeatStrip: ({ data, className, "data-testid": testId }: any) => (
    <div data-testid={testId || "heat-strip"} className={className}>
      HeatStrip ({data?.length || 0} items)
    </div>
  ),
}));

jest.mock("../../../components/Sparkline", () => ({
  __esModule: true,
  default: ({ data, className, "data-testid": testId }: any) => (
    <div data-testid={testId || "sparkline"} className={className}>
      Sparkline ({data?.length || 0} points)
    </div>
  ),
}));

// Mock Market Fixture
const SAMPLE_MARKET: Market = {
  id: "btc-price-preview",
  title: "Bitcoin Price Q3 2024",
  description: "Will BTC exceed $75K by Q3 2024?",
  icon: "TrendingUp",
  iconColor: "blue",
  yesOdds: 68,
  noOdds: 32,
  poolAmount: 1245,
  endsIn: "3 days",
  sparklineData: [45, 52, 48, 61, 68, 72, 68],
  activity24h: [12, 8, 5, 3, 2, 4, 10, 22, 45, 68],
  status: "active",
};

function resetStores() {
  act(() => {
    useFollowsStore.setState({ followedIds: new Set() });
    useUserLimitsStore.setState({
      remainingDailyAllowance: { "btc-price-preview": 250 },
    });
  });
  window.localStorage.clear();
}

describe("MarketPreviewCard", () => {
  beforeEach(resetStores);

  it("renders the trigger element children", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET}>
        <button>Hover Market Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByRole("button", { name: /hover market trigger/i })).toBeInTheDocument();
  });

  it("renders preview card content when controlled open is true", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true}>
        <button>Hover Market Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByText("Bitcoin Price Q3 2024")).toBeInTheDocument();
    expect(screen.getByText("Will BTC exceed $75K by Q3 2024?")).toBeInTheDocument();
    expect(screen.getByTestId("market-status-badge")).toHaveTextContent("Active");
    expect(screen.getByText("Yes: 68%")).toBeInTheDocument();
    expect(screen.getByText("No: 32%")).toBeInTheDocument();
    expect(screen.getByText(/1,245 USDC/)).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
  });

  it("renders sparkline and heat strip by default when data is present", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByTestId("preview-sparkline-btc-price-preview")).toBeInTheDocument();
    expect(screen.getByTestId("preview-heat-strip-btc-price-preview")).toBeInTheDocument();
  });

  it("hides sparkline and heat strip when prop flags are set to false", () => {
    render(
      <MarketPreviewCard
        market={SAMPLE_MARKET}
        open={true}
        showSparkline={false}
        showHeatStrip={false}
      >
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.queryByTestId("preview-sparkline-btc-price-preview")).toBeNull();
    expect(screen.queryByTestId("preview-heat-strip-btc-price-preview")).toBeNull();
  });

  it("displays betting allowance nudge from store", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    const nudge = screen.getByTestId("preview-allowance-nudge");
    expect(nudge).toHaveTextContent("Daily allowance remaining:");
    expect(nudge).toHaveTextContent("250 USDC");
  });

  it("displays following indicator when market is followed in store", () => {
    act(() => {
      useFollowsStore.getState().follow("btc-price-preview");
    });

    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByTestId("preview-following-indicator")).toHaveTextContent(
      "You're following this market"
    );
  });

  it("renders quick actions with link to market details page", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    const viewLink = screen.getByTestId("preview-view-market-btc-price-preview");
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute("href", "/markets/btc-price-preview");
  });

  it("hides quick actions when showActions is false", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true} showActions={false}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.queryByTestId("preview-view-market-btc-price-preview")).toBeNull();
  });

  it("opens preview on trigger focus and closes on blur", () => {
    render(
      <MarketPreviewCard market={SAMPLE_MARKET}>
        <button tabIndex={0}>Focusable Trigger</button>
      </MarketPreviewCard>
    );

    const triggerSpan = screen.getByTestId("market-preview-trigger-btc-price-preview");
    
    // Focus opens preview card
    fireEvent.focus(triggerSpan);
    expect(screen.getByText("Bitcoin Price Q3 2024")).toBeInTheDocument();

    // Blur closes preview card
    fireEvent.blur(triggerSpan);
    expect(screen.queryByText("Bitcoin Price Q3 2024")).toBeNull();
  });

  it("closes open preview card when Escape key is pressed", () => {
    const onOpenChange = jest.fn();

    render(
      <MarketPreviewCard market={SAMPLE_MARKET} open={true} onOpenChange={onOpenChange}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders status badges correctly for ended and upcoming markets", () => {
    const endedMarket = { ...SAMPLE_MARKET, status: "ended" as const };
    const { rerender } = render(
      <MarketPreviewCard market={endedMarket} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByTestId("market-status-badge")).toHaveTextContent("Ended");

    const upcomingMarket = { ...SAMPLE_MARKET, status: "upcoming" as const };
    rerender(
      <MarketPreviewCard market={upcomingMarket} open={true}>
        <button>Trigger</button>
      </MarketPreviewCard>
    );

    expect(screen.getByTestId("market-status-badge")).toHaveTextContent("Upcoming");
  });
});
