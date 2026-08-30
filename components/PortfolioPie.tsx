"use client";

/**
 * PortfolioPie — stake distribution chart for the My Predictions page.
 *
 * Renders a Recharts PieChart showing the user's total staked amount split
 * across Active / Pending / Won / Lost positions.  A visually-hidden
 * <table> is provided as an SR fallback (WCAG 2.1 AA, SC 1.1.1 & 1.3.1).
 *
 * @module components/PortfolioPie
 */

import React, { useCallback, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single slice of the portfolio distribution. */
export interface PortfolioSlice {
  /** Human-readable label (e.g. "Active"). */
  label: string;
  /** Total staked amount for this status. */
  value: number;
  /** Hex colour token used for the slice fill. */
  color: string;
}

export interface PortfolioPieProps {
  /**
   * Array of slices to render.  Pass an empty array to show the zero-data
   * placeholder.
   */
  data: PortfolioSlice[];
  /**
   * Currency / token label appended to tooltip values (default: "XLM").
   */
  token?: string;
}

// ─── Colour palette ──────────────────────────────────────────────────────────

/**
 * Brand-aligned, WCAG-AA-contrast colours for each status slice.
 * These intentionally avoid generic primary colours and match the purple
 * brand palette used across the dashboard.
 */
export const STATUS_COLORS: Record<string, string> = {
  Active: "#7C3AED",  // violet-600 — clear, vibrant
  Pending: "#F59E0B", // amber-500  — distinct from violet
  Won: "#10B981",     // emerald-500 — positive
  Lost: "#F43F5E",    // rose-500   — negative, differentiated from red
};

// ─── Active-shape renderer ───────────────────────────────────────────────────

/**
 * Custom active-shape for the hovered slice — adds an outer ring and
 * slightly pops the slice outward for a premium micro-interaction feel.
 */
const renderActiveShape = (props: PieSectorDataItem) => {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props as PieSectorDataItem & {
    payload: PortfolioSlice;
    percent: number;
    value: number;
  };

  const pct = ((percent ?? 0) * 100).toFixed(1);

  return (
    <g>
      {/* Outer glow ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(outerRadius as number) + 4}
        outerRadius={(outerRadius as number) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      {/* Primary slice — offset outward */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius as number) + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Centre label */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill={fill}
        className="text-sm font-semibold"
        fontSize={14}
        fontWeight={700}
      >
        {(payload as PortfolioSlice).label}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="currentColor"
        fontSize={12}
        opacity={0.7}
      >
        {pct}%
      </text>
      <text
        x={cx}
        y={cy + 30}
        textAnchor="middle"
        fill="currentColor"
        fontSize={11}
        opacity={0.55}
      >
        {value} XLM
      </text>
    </g>
  );
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PortfolioSlice; value: number; payload: PortfolioSlice }>;
  token: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  token,
}) => {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload as PortfolioSlice;
  const pct =
    payload[0] &&
    (payload[0] as unknown as { percent: number }).percent !== undefined
      ? ((payload[0] as unknown as { percent: number }).percent * 100).toFixed(1)
      : "—";

  return (
    <div
      role="tooltip"
      className="rounded-xl border border-white/10 bg-white/95 dark:bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-sm text-sm"
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full mr-2"
        style={{ backgroundColor: slice.color }}
        aria-hidden="true"
      />
      <span className="font-semibold text-gray-900 dark:text-white">
        {slice.label}
      </span>
      <div className="mt-1 text-gray-600 dark:text-gray-300">
        {slice.value} {token} &nbsp;·&nbsp; {pct}%
      </div>
    </div>
  );
};

// ─── SR Table fallback ────────────────────────────────────────────────────────

interface SRTableProps {
  data: PortfolioSlice[];
  total: number;
  token: string;
}

/**
 * Visually-hidden table that exposes the chart data to screen readers.
 * The containing chart SVG is aria-hidden; this table carries the semantic
 * meaning (WCAG 2.1 AA — SC 1.1.1 Non-text Content).
 */
const SRTable: React.FC<SRTableProps> = ({ data, total, token }) => (
  <table
    data-testid="portfolio-pie-sr-table"
    className="sr-only"
    summary="Portfolio distribution by prediction status"
  >
    <caption>Portfolio distribution by prediction status</caption>
    <thead>
      <tr>
        <th scope="col">Status</th>
        <th scope="col">Amount ({token})</th>
        <th scope="col">Percentage</th>
      </tr>
    </thead>
    <tbody>
      {data.map((slice) => {
        const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
        return (
          <tr key={slice.label}>
            <td>{slice.label}</td>
            <td>{slice.value}</td>
            <td>{pct}%</td>
          </tr>
        );
      })}
    </tbody>
    <tfoot>
      <tr>
        <th scope="row">Total</th>
        <td>{total}</td>
        <td>100%</td>
      </tr>
    </tfoot>
  </table>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC<{ data: PortfolioSlice[]; total: number; token: string }> = ({
  data,
  total,
  token,
}) => (
  <ul
    aria-label="Portfolio legend"
    className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-2"
  >
    {data.map((slice) => {
      const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
      return (
        <li key={slice.label} className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="flex-shrink-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span className="truncate text-sm text-gray-700 dark:text-gray-300">
            {slice.label}
          </span>
          <span className="ml-auto flex-shrink-0 font-semibold text-sm text-gray-900 dark:text-white tabular-nums">
            {slice.value}
            <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
              {token}
            </span>
          </span>
          <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums w-10 text-right">
            {pct}%
          </span>
        </li>
      );
    })}
  </ul>
);

// ─── Zero-state placeholder ───────────────────────────────────────────────────

const ZeroState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
    <svg
      aria-hidden="true"
      className="h-12 w-12 opacity-30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
    <p className="text-sm">No staked positions yet</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * PortfolioPie
 *
 * Renders an interactive donut pie chart of the user's prediction portfolio
 * broken down by status.  Includes a screen-reader `<table>` fallback.
 *
 * @example
 * ```tsx
 * <PortfolioPie
 *   data={[
 *     { label: "Active",  value: 10, color: "#7C3AED" },
 *     { label: "Pending", value: 5,  color: "#F59E0B" },
 *     { label: "Won",     value: 20, color: "#10B981" },
 *     { label: "Lost",    value: 15, color: "#F43F5E" },
 *   ]}
 *   token="XLM"
 * />
 * ```
 */
export const PortfolioPie: React.FC<PortfolioPieProps> = ({
  data,
  token = "XLM",
}) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const total = data.reduce((sum, s) => sum + s.value, 0);

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  const hasData = total > 0;

  return (
    <section
      aria-label="Portfolio distribution"
      data-testid="portfolio-pie"
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Portfolio Distribution
        </h2>
        {hasData && (
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            Total staked: {total} {token}
          </span>
        )}
      </header>

      {/* SR-only data table — aria-hidden on the chart below */}
      <SRTable data={data} total={total} token={token} />

      {hasData ? (
        <>
          {/* Chart — aria-hidden; data is conveyed by the SR table above */}
          <div aria-hidden="true" className="h-52 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="70%"
                  paddingAngle={3}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape as Parameters<typeof Pie>[0]["activeShape"]}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="none"
                >
                  {data.map((slice, index) => (
                    <Cell
                      key={`cell-${slice.label}`}
                      fill={slice.color}
                      opacity={
                        activeIndex === undefined || activeIndex === index
                          ? 1
                          : 0.45
                      }
                      style={{ transition: "opacity 200ms ease, filter 200ms ease" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip token={token} />}
                  wrapperStyle={{ outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <Legend data={data} total={total} token={token} />
        </>
      ) : (
        <ZeroState />
      )}
    </section>
  );
};

export default PortfolioPie;
