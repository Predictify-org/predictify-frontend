import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFollowsStore } from "@/app/state/follows";
import { useUserLimitsStore } from "@/app/state/userLimits";
import type { Market } from "@/content/markets.sample";

// ── stub for Card ────────────────────────────────────────────────────────────
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

// ── helper: reset stores between tests ──────────────────────────────────────
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

describe("MarketCard", () => {
  beforeEach(resetStores);

  // ---- Rendering ------------------------------------------------------------

  it("renders the market title and description", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.getByText("Test Market")).toBeInTheDocument();
    expect(screen.getByText("A test market description")).toBeInTheDocument();
  });

  it("renders odds", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.getByText("Yes: 65%")).toBeInTheDocument();
    expect(screen.getByText("No: 35%")).toBeInTheDocument();
  });

  it("renders the sparkline", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.getByTestId("sparkline-test-market")).toBeInTheDocument();
  });

  it("renders the heat strip", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.getByTestId("heat-strip-test-market")).toBeInTheDocument();
  });

  it("renders the betting limit nudge", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    const nudge = screen.getByTestId("betting-limit-nudge");
    expect(nudge).toHaveTextContent("Daily betting allowance remaining:");
    expect(nudge).toHaveTextContent("200 USDC");
  });

  it("renders pool amount and end date", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.getByText(/Pool:/)).toHaveTextContent("5,000 USDC");
    expect(screen.getByText(/Ends in/)).toHaveTextContent("5 days");
  });

  it("toggles save for later state from the market card", async () => {
    const user = userEvent.setup();
    render(<MarketCard market={SAMPLE_MARKET} />);

    const button = screen.getByRole("button", {
      name: /save test market for later/i,
    });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(
      screen.getByRole("button", {
        name: /remove test market from saved items/i,
      }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("predictify-saved-markets")).toContain(
      "test-market",
    );
  });

  it("removes a saved market from local storage when toggled off", async () => {
    const user = userEvent.setup();
    render(<MarketCard market={SAMPLE_MARKET} />);

    const button = screen.getByRole("button", {
      name: /save test market for later/i,
    });

    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem("predictify-saved-markets")).toBe("[]");
  });

  // ---- Following indicator --------------------------------------------------

  it("does not show following indicator by default", () => {
    render(<MarketCard market={SAMPLE_MARKET} />);
    expect(screen.queryByTestId("following-indicator")).toBeNull();
  });

  it("shows following indicator when market is followed", () => {
    act(() => {
      useFollowsStore.getState().follow("test-market");
    });
    render(<MarketCard market={SAMPLE_MARKET} />);
    const indicator = screen.getByTestId("following-indicator");
    expect(indicator).toHaveTextContent("You're following this");
  });

  // ---- Allowance nudge ------------------------------------------------------

  it("updates the nudge when allowance changes in store", () => {
    act(() => {
      useUserLimitsStore
        .getState()
        .setRemainingDailyAllowance("test-market", 45);
    });
    render(<MarketCard market={SAMPLE_MARKET} />);
    const nudge = screen.getByTestId("betting-limit-nudge");
    expect(nudge).toHaveTextContent("45 USDC");
  });

  // ---- Animation delay ------------------------------------------------------

  it("applies animation delay based on index", () => {
    render(
      <MarketCard market={SAMPLE_MARKET} index={2} reducedMotion={false} />,
    );
    const card = screen.getByText("Test Market").closest("div[style]");
    expect(card).toBeInTheDocument();
  });

  it("skips animation when reducedMotion is true", () => {
    const { container } = render(
      <MarketCard market={SAMPLE_MARKET} reducedMotion={true} />,
    );
    expect(container.innerHTML).not.toContain("animate-slide-up");
  });
});
