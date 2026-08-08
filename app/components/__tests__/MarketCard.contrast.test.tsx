import React from "react";
import { render, act } from "@testing-library/react";
import { useFollowsStore } from "@/app/state/follows";
import { useUserLimitsStore } from "@/app/state/userLimits";
import type { Market } from "@/content/markets.sample";

// MarketCard.tsx uses Tooltip and SaveForLater as globals (not imported).
// Define them in the test scope so the module can require them.
(globalThis as any).Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>;
(globalThis as any).SaveForLater = () => <button>Save</button>;

// ── stubs for Card ───────────────────────────────────────────────────────────
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

// ── fixture ──────────────────────────────────────────────────────────────────
const SAMPLE_MARKET: Market = {
  id: "test-market",
  title: "Test Market",
  description: "A test market description",
  icon: "TrendingUp",
  iconColor: "blue",
  yesOdds: 65,
  noOdds: 35,
  poolAmount: 5000,
  endsIn: "5 days",
  sparklineData: [40, 50, 60, 55, 65, 70, 65],
  activity24h: [
    10, 8, 4, 2, 1, 3, 8, 20, 40, 60, 75, 85, 90, 88, 82, 78, 68, 55, 45, 35,
    28, 20, 14, 10,
  ],
  status: "active",
};

function resetStores() {
  act(() => {
    useFollowsStore.setState({ followedIds: new Set() });
    useUserLimitsStore.setState({
      remainingDailyAllowance: { "test-market": 200 },
    });
  });
  window.localStorage.clear();
}

const { MarketCard } = require("../MarketCard");

describe("MarketCard prefers-contrast: more", () => {
  beforeEach(resetStores);

  it("applies the market-card CSS class for high-contrast targeting", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    const card = document.querySelector(".market-card");
    expect(card).toBeInTheDocument();
  });

  it("applies market-card class alongside other base classes", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    const card = document.querySelector(".market-card");
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain("border-white/10");
    expect(card?.className).toContain("bg-[#201F3780]");
  });

  it("renders without errors", () => {
    expect(() => {
      render(<MarketCard market={SAMPLE_MARKET} />);
    }).not.toThrow();
  });
});