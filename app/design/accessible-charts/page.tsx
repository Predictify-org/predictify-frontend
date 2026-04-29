"use client"

import React from "react"
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const activityData = [
  { month: "Jan", predictions: 120, volume: 4500 },
  { month: "Feb", predictions: 150, volume: 5200 },
  { month: "Mar", predictions: 180, volume: 6100 },
  { month: "Apr", predictions: 220, volume: 7800 },
  { month: "May", predictions: 300, volume: 9500 },
  { month: "Jun", predictions: 280, volume: 8900 },
]

const activityConfig = {
  predictions: {
    label: "Predictions",
    color: "hsl(var(--primary))",
  },
  volume: {
    label: "Volume ($)",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig

const growthData = [
  { region: "North America", users: 2500 },
  { region: "Europe", users: 1800 },
  { region: "Asia", users: 3200 },
  { region: "Other", users: 900 },
]

const growthConfig = {
  users: {
    label: "Total Users",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function AccessibleChartsPage() {
  return (
    <div className="min-h-screen bg-black p-8 space-y-12 max-w-6xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Accessible Charts Pattern</h1>
        <p className="text-slate-400">
          This pattern ensures charts are usable by screen readers and keyboard users. 
          Focus on a chart to see the "View as Data Table" toggle.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Line Chart Example */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Monthly Activity Trend</CardTitle>
            <CardDescription className="text-slate-400">
              User engagement and trading volume over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={activityConfig}
              accessibilityLabel="Line chart showing monthly activity"
              accessibilitySummary="The chart shows a steady upward trend in both predictions and volume from January to May, with a slight dip in June. Predictions peaked in May at 300."
              accessibilityData={activityData}
              className="h-[300px]"
            >
              <LineChart data={activityData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)' }} 
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="predictions"
                  stroke="var(--color-predictions)"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-volume)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart Example */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">User Distribution</CardTitle>
            <CardDescription className="text-slate-400">
              Current user base breakdown by geographical region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={growthConfig}
              accessibilityLabel="Bar chart showing user distribution by region"
              accessibilitySummary="Asia is the largest region with 3,200 users, followed by North America with 2,500. Europe has 1,800 users, and other regions account for 900."
              accessibilityData={growthData}
              className="h-[300px]"
            >
              <BarChart data={growthData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="region" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)' }} 
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="users" 
                  fill="var(--color-users)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Explanation */}
      <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold text-white">Accessibility Specs</h2>
        <div className="grid md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <h3 className="font-bold text-primary">Keyboard Focus</h3>
            <p className="text-slate-400">
              Charts are focusable via Tab key. On focus, a "View as Data Table" button appears, 
              allowing keyboard users to toggle a textual representation.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-primary">Screen Reader Summaries</h3>
            <p className="text-slate-400">
              Each chart contains an <code>aria-live="polite"</code> hidden summary that 
              provides the high-level trend and key data points, so users don't have to navigate individual bars/points.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-primary">Semantic Fallback</h3>
            <p className="text-slate-400">
              When toggled, the chart is replaced by a semantic <code>&lt;table&gt;</code> element, 
              ensuring 100% data accessibility regardless of visual rendering issues.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
