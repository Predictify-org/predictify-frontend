/**
 * PortfolioPie — focused unit tests
 *
 * Covers:
 *  1. Renders without crashing on valid data
 *  2. test-id "portfolio-pie" is present
 *  3. SR table is present (data-testid="portfolio-pie-sr-table")
 *  4. SR table contains all 4 status rows
 *  5. SR table percentage values sum to ~100 %
 *  6. Zero-data: renders zero-state placeholder, not the chart
 *  7. Single non-zero slice: renders SR table with one populated row
 *  8. aria-hidden on the chart wrapper (non-SR content hidden)
 *  9. Snapshot of full component with default data
 * 10. Snapshot of zero-state
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { PortfolioPie, STATUS_COLORS } from "../PortfolioPie";
import type { PortfolioSlice } from "../PortfolioPie";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Mock Recharts so rendering doesn't depend on SVG/canvas support in jsdom. */
jest.mock("recharts", () => {
  const Recharts = jest.requireActual<typeof import("recharts")>("recharts");
  return {
    ...Recharts,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <div data-testid="recharts-responsive-container">{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <svg data-testid="recharts-pie-chart">{children}</svg>
    ),
    Pie: ({ data }: { data: PortfolioSlice[] }) => (
      <g data-testid="recharts-pie">
        {data.map((d) => (
          <g key={d.label} data-slice={d.label} />
        ))}
      </g>
    ),
    Cell: ({ fill }: { fill: string }) => (
      <rect data-testid="recharts-cell" fill={fill} />
    ),
    Tooltip: () => null,
    Sector: () => <g />,
  };
});

/** Default 4-slice test data mirroring MOCK_PREDICTIONS totals. */
const DEFAULT_DATA: PortfolioSlice[] = [
  { label: "Active", value: 10, color: STATUS_COLORS.Active },
  { label: "Pending", value: 5, color: STATUS_COLORS.Pending },
  { label: "Won", value: 28, color: STATUS_COLORS.Won },
  { label: "Lost", value: 15, color: STATUS_COLORS.Lost },
];

/** Total expected for DEFAULT_DATA */
const TOTAL = DEFAULT_DATA.reduce((s, d) => s + d.value, 0); // 58

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("PortfolioPie", () => {
  // ── 1. Renders without crashing ──────────────────────────────────────────
  it("renders without crashing on valid data", () => {
    expect(() =>
      render(<PortfolioPie data={DEFAULT_DATA} token="XLM" />)
    ).not.toThrow();
  });

  // ── 2. Root test-id ──────────────────────────────────────────────────────
  it('renders the section with data-testid="portfolio-pie"', () => {
    render(<PortfolioPie data={DEFAULT_DATA} />);
    expect(screen.getByTestId("portfolio-pie")).toBeInTheDocument();
  });

  // ── 3. SR table is present ───────────────────────────────────────────────
  it('renders an SR table with data-testid="portfolio-pie-sr-table"', () => {
    render(<PortfolioPie data={DEFAULT_DATA} />);
    const table = screen.getByTestId("portfolio-pie-sr-table");
    expect(table).toBeInTheDocument();
    // Must carry sr-only class so it is visually hidden but DOM-accessible
    expect(table).toHaveClass("sr-only");
  });

  // ── 4. SR table rows ─────────────────────────────────────────────────────
  it("SR table contains one row per slice", () => {
    render(<PortfolioPie data={DEFAULT_DATA} />);
    const table = screen.getByTestId("portfolio-pie-sr-table");
    const bodyRows = within(table).getAllByRole("row");
    // thead row + 4 body rows + tfoot row = 6
    expect(bodyRows).toHaveLength(DEFAULT_DATA.length + 2);
  });

  // ── 5. SR table has correct label cells ──────────────────────────────────
  it("SR table displays each status label", () => {
    render(<PortfolioPie data={DEFAULT_DATA} />);
    const table = screen.getByTestId("portfolio-pie-sr-table");
    DEFAULT_DATA.forEach(({ label }) => {
      expect(within(table).getByText(label)).toBeInTheDocument();
    });
  });

  // ── 6. SR table percentage values ────────────────────────────────────────
  it("SR table shows correct percentage for each slice", () => {
    render(<PortfolioPie data={DEFAULT_DATA} token="XLM" />);
    const table = screen.getByTestId("portfolio-pie-sr-table");

    DEFAULT_DATA.forEach(({ value }) => {
      const pct = ((value / TOTAL) * 100).toFixed(1) + "%";
      expect(within(table).getByText(pct)).toBeInTheDocument();
    });
  });

  // ── 7. Zero-data: shows placeholder, not chart ───────────────────────────
  it("renders zero-state placeholder when all values are 0", () => {
    const zeroData: PortfolioSlice[] = DEFAULT_DATA.map((d) => ({
      ...d,
      value: 0,
    }));
    render(<PortfolioPie data={zeroData} />);
    expect(
      screen.getByText(/no staked positions yet/i)
    ).toBeInTheDocument();
    // Recharts chart must NOT be present
    expect(screen.queryByTestId("recharts-responsive-container")).toBeNull();
  });

  // ── 8. Single non-zero slice ─────────────────────────────────────────────
  it("handles a single non-zero slice without crashing", () => {
    const singleSlice: PortfolioSlice[] = [
      { label: "Won", value: 42, color: STATUS_COLORS.Won },
    ];
    render(<PortfolioPie data={singleSlice} token="USDC" />);
    const table = screen.getByTestId("portfolio-pie-sr-table");
    expect(within(table).getByText("Won")).toBeInTheDocument();
    expect(within(table).getByText("100.0%")).toBeInTheDocument();
  });

  // ── 9. aria-hidden on chart wrapper ──────────────────────────────────────
  it("the chart area is aria-hidden so screen readers use the SR table", () => {
    render(<PortfolioPie data={DEFAULT_DATA} />);
    // The div wrapping ResponsiveContainer must have aria-hidden="true"
    const chartWrapper = screen
      .getByTestId("portfolio-pie")
      .querySelector('[aria-hidden="true"]');
    expect(chartWrapper).not.toBeNull();
  });

  // ── 10. Token label ──────────────────────────────────────────────────────
  it('displays the custom token label in the SR table header', () => {
    render(<PortfolioPie data={DEFAULT_DATA} token="USDC" />);
    const table = screen.getByTestId("portfolio-pie-sr-table");
    expect(within(table).getByText(/Amount \(USDC\)/)).toBeInTheDocument();
  });

  // ── 11. Snapshot — default data ──────────────────────────────────────────
  it("matches snapshot with default data", () => {
    const { container } = render(<PortfolioPie data={DEFAULT_DATA} token="XLM" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // ── 12. Snapshot — zero state ────────────────────────────────────────────
  it("matches snapshot with zero data", () => {
    const zeroData: PortfolioSlice[] = DEFAULT_DATA.map((d) => ({
      ...d,
      value: 0,
    }));
    const { container } = render(<PortfolioPie data={zeroData} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
