"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle, HelpCircle, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/cards/stat-card"
import { RecommendationProvenance, type RecommendationSignalKey } from "@/components/cards/recommendation-provenance"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RecommendationsStrip } from "@/components/dashboard/RecommendationsStrip"
import { useEffect, useState } from "react"

interface Stat {
  label: string
  value: string
}

interface RecommendedMarket {
  id: string
  title: string
  category: string
  href: string
  signalKey: RecommendationSignalKey
  volume: string
}

const recommendedMarkets: RecommendedMarket[] = [
  {
    id: "ai-policy-2026",
    title: "Will a major AI safety bill pass this quarter?",
    category: "Politics",
    href: "/events",
    signalKey: "category_match",
    volume: "$18.4k volume",
  },
  {
    id: "eth-weekly-close",
    title: "Will ETH close above $4,000 this week?",
    category: "Crypto",
    href: "/events",
    signalKey: "similar_markets",
    volume: "$42.1k volume",
  },
  {
    id: "finals-game-seven",
    title: "Will the finals series reach game seven?",
    category: "Sports",
    href: "/events",
    signalKey: "trending",
    volume: "$27.9k volume",
  },
]

export default function DashboardPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [stats, setStats] = useState<Stat[] | null>(null)
  const [hiddenRecommendations, setHiddenRecommendations] = useState<string[]>([])

  // Simulate async fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      // For demo purposes, set success with static data
      const fetched = [
        { label: "Active Events", value: "24" },
        { label: "Total Predictions", value: "12,543" },
        { label: "Platform Fees", value: "$4,325.49" },
        { label: "Active Users", value: "573" },
      ]
      if (fetched.length === 0) {
        setStatus('empty')
      } else {
        setStats(fetched)
        setStatus('success')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const retry = () => {
    setStatus('loading')
    setStats(null)
    // Re‑trigger the effect by resetting the timer
    // (In a real app, you would refetch the data here)
    setTimeout(() => {
      // Simulate success after retry
      const fetched = [
        { label: "Active Events", value: "24" },
        { label: "Total Predictions", value: "12,543" },
        { label: "Platform Fees", value: "$4,325.49" },
        { label: "Active Users", value: "573" },
      ]
      setStats(fetched)
      setStatus('success')
    }, 1500)
  }

  const renderStatCard = (stat: Stat, idx: number) => {
    return <StatCard key={idx} stat={stat} index={idx} />
  }

  const renderCards = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No KPI data available.</p>
            <p className="text-sm text-muted-foreground mb-4">Create events to generate statistics.</p>
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
          </div>
        )
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTitle>Failed to load data</AlertTitle>
            <AlertDescription>
              An error occurred while fetching KPI information.
            </AlertDescription>
            <Button variant="outline" onClick={retry} className="mt-2">
              Retry
            </Button>
          </Alert>
        )
      case 'success':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats?.map((stat, idx) => renderStatCard(stat, idx))}
          </div>
        )
    }
  }

  const renderRecommendationStrip = () => {
    const visibleRecommendations = recommendedMarkets.filter(
      (market) => !hiddenRecommendations.includes(market.id)
    )

    if (visibleRecommendations.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">No recommendations right now</p>
              <p className="text-sm text-muted-foreground">
                We will refresh this strip as new market signals become available.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHiddenRecommendations([])}
            >
              Reset
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <section aria-labelledby="recommendations-title" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="recommendations-title" className="text-lg font-semibold">
              Recommended markets
            </h2>
            <p className="text-sm text-muted-foreground">
              A few markets matched to recent signals.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/events">View all markets</Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {visibleRecommendations.map((market) => (
            <Card key={market.id} className="overflow-hidden">
              <CardContent className="flex h-full flex-col gap-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                      {market.category}
                    </span>
                    <RecommendationProvenance
                      signalKey={market.signalKey}
                      marketTitle={market.title}
                      onStopRecommending={() =>
                        setHiddenRecommendations((current) => [
                          ...current,
                          market.id,
                        ])
                      }
                    />
                  </div>
                  <h3 className="text-base font-semibold leading-6">
                    <Link href={market.href} className="hover:underline">
                      {market.title}
                    </Link>
                  </h3>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{market.volume}</span>
                  <Button asChild variant="ghost" size="sm" className="px-2">
                    <Link href={market.href}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  const renderAnalyticsPanel = () => {
    switch (status) {
      case 'loading':
        return <Skeleton className="h-64 w-full rounded-xl" />
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No analytics data.</p>
            <p className="text-sm text-muted-foreground mb-4">Add events to view analytics.</p>
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
          </div>
        )
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTitle>Analytics load error</AlertTitle>
            <AlertDescription>Unable to fetch analytics data.</AlertDescription>
            <Button variant="outline" onClick={retry} className="mt-2">Retry</Button>
          </Alert>
        )
      case 'success':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder charts remain unchanged */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  User Growth Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>User Demographics</CardTitle>
                <CardDescription>Breakdown of user base</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Demographics Chart Placeholder
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  const renderReportsPanel = () => {
    switch (status) {
      case 'loading':
        return <Skeleton className="h-64 w-full rounded-xl" />
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No reports available.</p>
            <p className="text-sm text-muted-foreground mb-4">Generate reports from events.</p>
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
          </div>
        )
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTitle>Reports load error</AlertTitle>
            <AlertDescription>Unable to fetch report listings.</AlertDescription>
            <Button variant="outline" onClick={retry} className="mt-2">Retry</Button>
          </Alert>
        )
      case 'success':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>Download or view generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">Monthly Financial Summary</h3>
                    <p className="text-sm text-muted-foreground">April 2023</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">User Activity Report</h3>
                    <p className="text-sm text-muted-foreground">Last 30 days</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">Event Performance Analysis</h3>
                    <p className="text-sm text-muted-foreground">Q1 2023</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/events/new">Create New Event</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {renderCards()}
          {renderRecommendationStrip()}
          <RecommendationsStrip />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Platform Activity</CardTitle>
                <CardDescription>User activity and predictions over time</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Activity Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>Tasks requiring admin attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-5 w-5 text-amber-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">8 events need outcome verification</p>
                      <p className="text-sm text-muted-foreground">Deadline: Today</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Verify
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <HelpCircle className="h-5 w-5 text-red-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">12 disputes need resolution</p>
                      <p className="text-sm text-muted-foreground">3 high priority</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Resolve
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Monthly financial report ready</p>
                      <p className="text-sm text-muted-foreground">April 2023</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          {renderAnalyticsPanel()}
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          {renderReportsPanel()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

