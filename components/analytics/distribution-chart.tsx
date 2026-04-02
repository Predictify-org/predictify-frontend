"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AXIS_TICK_STYLE, CHART_COLORS, CHART_MARGIN, GRID_STYLE } from "./chart-styles";

const data = [
  { category: "Sports",   count: 38 },
  { category: "Politics", count: 24 },
  { category: "Crypto",   count: 19 },
  { category: "Finance",  count: 12 },
  { category: "Other",    count: 7  },
];

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.quinary,
];

const config: ChartConfig = {
  count: { label: "Markets (%)" },
};

/**
 * DistributionChart — horizontal bar chart showing market category share (%).
 * Each bar is a distinct colour; Y-axis labels the category, X-axis shows percentage.
 */
export function DistributionChart() {
  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={data} layout="vertical" margin={{ ...CHART_MARGIN, left: 8 }}>
        <CartesianGrid horizontal={false} {...GRID_STYLE} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${value}%`, "Share"]}
            />
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
