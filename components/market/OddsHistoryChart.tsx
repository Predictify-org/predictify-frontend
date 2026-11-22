"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, BarChart3, Minus, Table2, TrendingDown, TrendingUp } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  DEFAULT_HISTORY_RANGE,
  HISTORY_RANGES,
  type HistoryRange,
  type OddsHistoryOptions,
  type OddsPoint,
  getOddsHistory,
  parseHistoryRange,
} from "@/lib/market-history";
import { cn } from "@/lib/utils";

export interface OddsHistoryChartProps {
  marketId: string;
  /** Optional custom fetcher (defaults to `getOddsHistory`) */
  fetchHistory?: (
    marketId: string,
    range: HistoryRange,
    options?: OddsHistoryOptions
  ) => Promise<OddsPoint[]>;
  /** Optional market creation timestamp in ms */
  createdAt?: number;
  className?: string;
}

interface OddsSummary {
  start: number;
  end: number;
  min: number;
  max: number;
  delta: number;
}

function computeSummary(points: readonly OddsPoint[]): OddsSummary | null {
  if (points.length === 0) return null;
  const start = points[0].probability;
  const end = points[points.length - 1].probability;
  let min = start;
  let max = start;
  for (const pt of points) {
    if (pt.probability < min) min = pt.probability;
    if (pt.probability > max) max = pt.probability;
  }
  const delta = Math.round((end - start) * 10) / 10;
  return { start, end, min, max, delta };
}

function formatAxisTick(timestamp: number, range: HistoryRange): string {
  const date = new Date(timestamp);
  if (range === "1D") {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: OddsPoint; value: number }>;
}

function OddsTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{formatFullTimestamp(point.t)}</p>
      <p className="mt-0.5 text-muted-foreground">
        Yes probability:{" "}
        <span className="font-semibold text-foreground">
          {point.probability.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

export function OddsHistoryChart({
  marketId,
  fetchHistory = getOddsHistory,
  createdAt,
  className,
}: OddsHistoryChartProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const range = parseHistoryRange(searchParams.get("range"));

  const [data, setData] = useState<OddsPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHistory(marketId, range, createdAt !== undefined ? { createdAt } : undefined)
      .then((points) => {
        if (!cancelled) {
          setData(points);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load odds history.";
          setError(message);
          setData([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [marketId, range, createdAt, fetchHistory, reloadToken]);

  const handleRangeChange = useCallback(
    (nextRange: HistoryRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", nextRange);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleRangeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (index + 1) % HISTORY_RANGES.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (index - 1 + HISTORY_RANGES.length) % HISTORY_RANGES.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = HISTORY_RANGES.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextRange = HISTORY_RANGES[nextIndex];
        handleRangeChange(nextRange);
        radioRefs.current[nextIndex]?.focus();
      }
    },
    [handleRangeChange]
  );

  const summary = useMemo(() => computeSummary(data), [data]);

  const chartAriaLabel = useMemo(() => {
    if (!summary) {
      return `Odds history chart (${range}): no data available.`;
    }
    return `Odds history chart (${range}): start ${summary.start.toFixed(1)}%, end ${summary.end.toFixed(1)}%, min ${summary.min.toFixed(1)}%, max ${summary.max.toFixed(1)}%.`;
  }, [range, summary]);

  const trendDirection =
    summary && summary.delta > 0
      ? "up"
      : summary && summary.delta < 0
        ? "down"
        : "flat";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 text-card-foreground",
        className
      )}
    >
      {/* Header: summary metrics + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Yes Probability History</h3>
          {summary && !loading && !error ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="text-base font-bold text-foreground">
                {summary.end.toFixed(1)}%
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  trendDirection === "up" &&
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  trendDirection === "down" &&
                    "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                  trendDirection === "flat" && "bg-muted text-muted-foreground"
                )}
              >
                {trendDirection === "up" && (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {trendDirection === "down" && (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {trendDirection === "flat" && (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {summary.delta > 0 ? "+" : ""}
                  {summary.delta.toFixed(1)}% ({range})
                </span>
              </span>
              <span>
                Range: {summary.min.toFixed(1)}% – {summary.max.toFixed(1)}%
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Historical implied probability ({range})
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Odds history time range"
            className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5"
          >
            {HISTORY_RANGES.map((option, index) => {
              const isSelected = option === range;
              return (
                <button
                  key={option}
                  ref={(el) => {
                    radioRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleRangeChange(option)}
                  onKeyDown={(e) => handleRangeKeyDown(e, index)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {data.length > 0 && !loading && !error && (
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              aria-expanded={showTable}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showTable ? "Hide data table" : "Show data table"}
            </button>
          )}
        </div>
      </div>

      {/* Chart Body */}
      <div className="mt-4">
        {loading ? (
          <div
            role="status"
            aria-label="Loading odds history"
            className="flex h-64 flex-col justify-center gap-3 rounded-md border border-dashed border-border p-6"
          >
            <div
              className={cn(
                "h-4 w-1/3 rounded bg-muted",
                !reducedMotion && "animate-pulse"
              )}
            />
            <div
              className={cn(
                "h-40 w-full rounded bg-muted",
                !reducedMotion && "animate-pulse"
              )}
            />
            <span className="sr-only">Loading odds history…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center"
          >
            <AlertCircle
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Unable to load odds history
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div
            role="status"
            className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-center"
          >
            <BarChart3
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              No odds history available
            </p>
            <p className="text-xs text-muted-foreground">
              Historical probability data for this market is not available yet.
            </p>
          </div>
        ) : (
          <>
            <div
              role="region"
              aria-label={chartAriaLabel}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/60"
                  />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value: number) =>
                      formatAxisTick(value, range)
                    }
                    tick={{ fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                    tick={{ fontSize: 11 }}
                    width={42}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Tooltip content={<OddsTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="probability"
                    name="Yes probability"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={data.length === 1 ? { r: 4 } : false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={!reducedMotion}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accessible data table fallback (always in DOM for screen readers, toggleable visually) */}
            <div
              className={
                showTable
                  ? "mt-4 max-h-64 overflow-auto rounded-md border border-border"
                  : "sr-only"
              }
            >
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">
                  Odds history data table ({range})
                </caption>
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Time
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Probability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point) => (
                    <tr
                      key={point.t}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {formatFullTimestamp(point.t)}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-foreground">
                        {point.probability.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_HISTORY_RANGE };
