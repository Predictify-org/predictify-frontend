"use client"

import { useMemo } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Percent,
  Trophy,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { PortfolioPie, type PortfolioSlice } from "@/components/PortfolioPie"
import { MechanicHelp } from "@/components/patterns/MechanicHelp"
import { platformFeesHelp } from "@/components/patterns/mechanic-help-content"
import { usePrivacy } from "@/context/PrivacyContext"
import { maskAmount } from "@/utils/maskAmount"
import { computePortfolio, type Position } from "@/lib/portfolio-analytics"
import { mockPortfolioPositions } from "@/lib/mock-data"

const CATEGORY_PALETTE = [
  "#7C3AED", // violet
  "#10B981", // emerald
  "#F59E0B", // amber
  "#3B82F6", // blue
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
]

function formatCurrency(value: number, hideBalances: boolean): string {
  if (hideBalances) {
    return maskAmount(value)
  }
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? "-" : ""}${formatted} XLM`
}

function formatSignedCurrency(value: number, hideBalances: boolean): string {
  if (hideBalances) {
    return maskAmount(value)
  }
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${prefix}${formatted} XLM`
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "-"
  }
  return `${value.toFixed(2)}%`
}

export interface FinancesViewProps {
  positions?: readonly Position[]
  isLoading?: boolean
  now?: Date | string | number
}

export function FinancesView({
  positions = mockPortfolioPositions,
  isLoading = false,
  now,
}: FinancesViewProps) {
  const { hideBalances } = usePrivacy()

  const summary = useMemo(
    () => computePortfolio(positions, { now }),
    [positions, now]
  )

  const categorySlices: PortfolioSlice[] = useMemo(
    () =>
      summary.byCategory
        .filter((item) => item.invested > 0)
        .map((item, idx) => ({
          label: item.category,
          value: item.invested,
          color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
        })),
    [summary.byCategory]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="finances-loading">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Finances</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-36 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col gap-4" data-testid="finances-empty">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Finances</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Wallet className="h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">No portfolio positions yet</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Place predictions on active markets to track your realised and unrealised P&amp;L,
              ROI, and category win rates here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { totals, winRate, wins, losses, openCount, voidCount, byCategory, timeSeries } = summary
  const isPositivePnl = totals.totalPnl >= 0
  const isPositiveRealised = totals.realisedPnl >= 0
  const isPositiveUnrealised = totals.unrealisedPnl >= 0

  return (
    <div className="flex flex-col gap-4" data-testid="finances-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Finances</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <MechanicHelp content={platformFeesHelp} />
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums" data-testid="kpi-invested">
              {formatCurrency(totals.invested, hideBalances)}
            </div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <span>
                {openCount} open · {wins + losses} settled
                {voidCount > 0 ? ` · ${voidCount} void` : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realised P&amp;L</CardTitle>
            {isPositiveRealised ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${
                isPositiveRealised ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
              data-testid="kpi-realised-pnl"
            >
              {formatSignedCurrency(totals.realisedPnl, hideBalances)}
            </div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <span>
                Unrealised:{" "}
                <span
                  className={
                    isPositiveUnrealised
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                  data-testid="kpi-unrealised-pnl"
                >
                  {formatSignedCurrency(totals.unrealisedPnl, hideBalances)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio ROI</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${
                isPositivePnl ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
              data-testid="kpi-roi"
            >
              {formatPercent(totals.roi)}
            </div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <span>Total P&amp;L: {formatSignedCurrency(totals.totalPnl, hideBalances)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums" data-testid="kpi-win-rate">
              {formatPercent(winRate)}
            </div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <span>
                {wins}W / {losses}L (voids excluded)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Overview, Categories, Positions */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Cumulative P&amp;L
                </CardTitle>
                <CardDescription>
                  Chronological realised and mark-to-market cumulative P&amp;L
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {timeSeries.length > 0 ? (
                  <div className="h-[300px] w-full" data-testid="pnl-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(val: number) =>
                            hideBalances ? maskAmount(val) : `${val}`
                          }
                        />
                        <Tooltip
                          formatter={(val: number) => [
                            formatSignedCurrency(val, hideBalances),
                            "Cumulative P&L",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativePnl"
                          stroke="#7C3AED"
                          fill="#7C3AED"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] w-full rounded-md bg-muted/25 flex items-center justify-center text-sm text-muted-foreground">
                    No P&amp;L history available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="col-span-3">
              <PortfolioPie
                data={categorySlices}
                token="XLM"
                title="Stake by Category"
                hideValues={hideBalances}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Invested stake, P&amp;L, ROI, and win rate grouped by market category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Realised P&amp;L</TableHead>
                    <TableHead className="text-right">Unrealised P&amp;L</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCategory.map((cat) => (
                    <TableRow key={cat.category}>
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(cat.invested, hideBalances)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatSignedCurrency(cat.realisedPnl, hideBalances)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatSignedCurrency(cat.unrealisedPnl, hideBalances)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(cat.roi)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(cat.winRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
              <CardDescription>All tracked open, settled, and voided positions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">Payout / Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos, idx) => {
                    const value =
                      pos.status === "open"
                        ? pos.currentValue ?? pos.stake
                        : pos.status === "void"
                          ? pos.stake
                          : pos.payout ?? 0
                    return (
                      <TableRow key={`${pos.marketId}-${idx}`}>
                        <TableCell className="font-medium">{pos.title ?? pos.marketId}</TableCell>
                        <TableCell>{pos.category}</TableCell>
                        <TableCell className="capitalize">{pos.status}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(pos.stake, hideBalances)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(value, hideBalances)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function FinancesPage() {
  return <FinancesView positions={mockPortfolioPositions} />
}
