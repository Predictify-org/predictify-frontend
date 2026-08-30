"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

interface ProbabilityPoint {
  timestamp: number;
  probability: number;
}

interface ResolutionPreviewProps {
  data?: ProbabilityPoint[];
  className?: string;
}

function generateMockProbabilities(
  count = 50,
  seedProb = 0.5
): ProbabilityPoint[] {
  const now = Date.now();
  const start = now - 30 * 24 * 60 * 60 * 1000;
  const data: ProbabilityPoint[] = [];
  let prob = seedProb;

  for (let i = 0; i < count; i++) {
    const t = start + (i / (count - 1)) * (now - start);
    prob = Math.max(0.01, Math.min(0.99, prob + (Math.random() - 0.48) * 0.05));
    data.push({ timestamp: t, probability: Math.round(prob * 1000) / 1000 });
  }

  return data;
}

function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function formatTimestamp(ts: number): string {
  return format(ts, "MMM d, HH:mm");
}

function ResolutionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProbabilityPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-2 py-1.5 text-xs shadow-sm">
      <p className="font-medium tabular-nums">
        {formatProbability(point.probability)}
      </p>
      <p className="text-muted-foreground">
        {formatTimestamp(point.timestamp)}
      </p>
    </div>
  );
}

export function ResolutionPreview({
  data: externalData,
  className,
}: ResolutionPreviewProps) {
  const data = useMemo(
    () => externalData ?? generateMockProbabilities(),
    [externalData]
  );

  const high = useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.probability)) : 0),
    [data]
  );
  const low = useMemo(
    () => (data.length > 0 ? Math.min(...data.map((d) => d.probability)) : 0),
    [data]
  );
  const current =
    data.length > 0 ? data[data.length - 1].probability : 0;
  const firstTs = data.length > 0 ? data[0].timestamp : 0;
  const lastTs = data.length > 0 ? data[data.length - 1].timestamp : 0;

  const gradientId = "resolution-preview-gradient";

  return (
    <div
      className={className}
      role="img"
      aria-label={`Resolution preview: probability started at ${formatProbability(
        data.length > 0 ? data[0].probability : 0
      )}, high ${formatProbability(high)}, low ${formatProbability(
        low
      )}, current ${formatProbability(current)}`}
      style={{ width: 240, height: 64 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={[0, 1]} />
          <Tooltip
            content={<ResolutionTooltip />}
            cursor={{
              stroke: "hsl(var(--primary))",
              strokeWidth: 1,
              strokeDasharray: "2 2",
            }}
          />
          <Area
            type="monotone"
            dataKey="probability"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 3,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="sr-only" aria-live="polite">
        Probability path from {formatTimestamp(firstTs)} to{" "}
        {formatTimestamp(lastTs)}. High: {formatProbability(high)}, Low:{" "}
        {formatProbability(low)}, Current: {formatProbability(current)}.
      </div>
    </div>
  );
}
