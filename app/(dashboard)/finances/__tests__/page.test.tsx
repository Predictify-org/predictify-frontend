import React from "react";
import { render, screen } from "@testing-library/react";
import FinancesPage, { FinancesView } from "../page";
import { PrivacyProvider } from "@/context/PrivacyContext";
import type { Position } from "@/lib/portfolio-analytics";

// Mock ResponsiveContainer so Recharts renders cleanly in JSDOM
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  };
});

const sampleFixture: Position[] = [
  {
    marketId: "m-1",
    title: "Market A",
    category: "Sports",
    side: "yes",
    stake: 100,
    payout: 200,
    status: "won",
    openedAt: "2025-06-01T00:00:00.000Z",
    closedAt: "2025-06-02T00:00:00.000Z",
  },
  {
    marketId: "m-2",
    title: "Market B",
    category: "Crypto",
    side: "no",
    stake: 100,
    payout: 0,
    status: "lost",
    openedAt: "2025-06-03T00:00:00.000Z",
    closedAt: "2025-06-04T00:00:00.000Z",
  },
  {
    marketId: "m-3",
    title: "Market C",
    category: "Crypto",
    side: "yes",
    stake: 200,
    currentValue: 250,
    status: "open",
    openedAt: "2025-06-05T00:00:00.000Z",
  },
];

describe("FinancesPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the default page with adapted mock positions and no NaN/Infinity", () => {
    const { container } = render(
      <PrivacyProvider>
        <FinancesPage />
      </PrivacyProvider>
    );

    expect(screen.getByTestId("finances-dashboard")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });

  it("renders hand-computed KPIs for a known fixture", () => {
    render(
      <PrivacyProvider>
        <FinancesView positions={sampleFixture} now="2025-06-10T00:00:00.000Z" />
      </PrivacyProvider>
    );

    // Invested: 100 + 100 + 200 = 400.00 XLM
    expect(screen.getByTestId("kpi-invested")).toHaveTextContent("400.00 XLM");
    // Realised P&L: +100 - 100 = 0.00 XLM
    expect(screen.getByTestId("kpi-realised-pnl")).toHaveTextContent("0.00 XLM");
    // Unrealised P&L: +50.00 XLM
    expect(screen.getByTestId("kpi-unrealised-pnl")).toHaveTextContent("+50.00 XLM");
    // ROI: 50 / 400 = 12.50%
    expect(screen.getByTestId("kpi-roi")).toHaveTextContent("12.50%");
    // Win rate: 1 / 2 = 50.00%
    expect(screen.getByTestId("kpi-win-rate")).toHaveTextContent("50.00%");
  });

  it("renders empty state when positions array is empty", () => {
    const { container } = render(
      <PrivacyProvider>
        <FinancesView positions={[]} />
      </PrivacyProvider>
    );

    expect(screen.getByTestId("finances-empty")).toBeInTheDocument();
    expect(screen.getByText(/No portfolio positions yet/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });

  it("renders loading state when isLoading is true", () => {
    render(
      <PrivacyProvider>
        <FinancesView positions={[]} isLoading />
      </PrivacyProvider>
    );

    expect(screen.getByTestId("finances-loading")).toBeInTheDocument();
  });

  it('displays "-" for win rate when there are 0 closed positions', () => {
    const openOnly: Position[] = [
      {
        marketId: "open-only",
        category: "Sports",
        side: "yes",
        stake: 150,
        status: "open",
        openedAt: "2025-06-01T00:00:00.000Z",
      },
    ];

    render(
      <PrivacyProvider>
        <FinancesView positions={openOnly} />
      </PrivacyProvider>
    );

    expect(screen.getByTestId("kpi-win-rate")).toHaveTextContent("-");
  });

  it("masks balances when hideBalances is enabled", () => {
    window.localStorage.setItem("privacy.hideBalances", "true");

    render(
      <PrivacyProvider>
        <FinancesView positions={sampleFixture} now="2025-06-10T00:00:00.000Z" />
      </PrivacyProvider>
    );

    expect(screen.getByTestId("kpi-invested")).toHaveTextContent("••••");
    expect(screen.getByTestId("kpi-realised-pnl")).toHaveTextContent("••••");
    expect(screen.getByTestId("kpi-unrealised-pnl")).toHaveTextContent("••••");
  });
});
