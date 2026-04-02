"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
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
  { month: "Oct", volume: 4200 },
  { month: "Nov", volume: 6800 },
  { month: "Dec", volume: 5900 },
  { month: "Jan", volume: 9100 },
  { month: "Feb", volume: 11400 },
  { month: "Mar", volume: 14800 },
];

const config: ChartConfig = {
  volume: { label: "Volume (XLM)", color: CHART_COLORS.primary },
};

/**
 * VolumeChart — line chart showing monthly prediction volume in XLM.
 * Axes are labelled with units; tooltip shows exact value + unit.
 */
export function VolumeChart() {
  return (
    <ChartContainer config={config} className="h-full w-full">
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="month"
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          label={{
            value: "XLM",
            angle: -90,
            position: "insideLeft",
            offset: 12,
            style: { ...AXIS_TICK_STYLE, textAnchor: "middle" },
          }}
          width={44}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toLocaleString()} XLM`, "Volume"]}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="volume"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.primary }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
