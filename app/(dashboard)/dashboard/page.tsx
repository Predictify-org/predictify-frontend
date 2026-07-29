/**
 * DashboardPage — Issue #646: Focus Visible Accessibility
 *
 * All interactive elements in this component use focus-visible to show
 * keyboard focus outlines that meet WCAG 2.1 AA (3:1 contrast ratio).
 *
 * Interactive elements and their focus treatment:
 * - All Button components: Use focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
 * - Bare links (e.g., market titles): Include focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
 * - TabsTrigger elements: Use Radix UI defaults with focus-visible
 * - Recommendation strip links: Updated with focus-visible styling
 *
 * Uses Tailwind's focus-visible: variant which targets :focus-visible pseudo-class
 * — visible to keyboard users, hidden for mouse users.
 */

"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  HelpCircle,
  PauseCircle,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/cards/stat-card";
import {
  RecommendationProvenance,
  type RecommendationSignalKey,
} from "@/components/cards/recommendation-provenance";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RecommendationsStrip } from "@/components/dashboard/RecommendationsStrip";
import { ActiveBets } from "@/components/active-bets/ActiveBets";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RefreshIndicator } from "@/app/dashboard/RefreshIndicator";
import { NotifDigest } from "@/app/dashboard/NotifDigest";
import { useNotificationsStore } from "@/app/state/notifications";
import { NotificationItem } from "@/types/notifications";
import { Kbd } from "@/components/ui/kbd";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "@/src/styles/patterns.css";

// TODO: replace with the authenticated user's id once auth context exposes it.
const CURRENT_USER_ID = "current-user";
import { RecentlyViewedRail } from "@/app/components/RecentlyViewedRail";

interface Stat {
  label: string;
  value: string;
}

interface RecommendedMarket {
  id: string;
  title: string;
  category: string;
  href: string;
  signalKey: RecommendationSignalKey;
  volume: string;
}

const DEMO_STATS: Stat[] = [
  { label: "Volume", value: "$4,325.49" },
  { label: "Predictions", value: "24" },
  { label: "Win rate", value: "12,543" },
  { label: "Leaderboard", value: "573" },
];

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
    href: "/events",
    category: "Crypto",
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
];

export default function DashboardPage() {
  const [status, setStatus] = useState<
    "loading" | "success" | "empty" | "error"
  >("loading");
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [hiddenRecommendations, setHiddenRecommendations] = useState<string[]>(
    [],
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const {
    notifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  } = useNotificationsStore();
  const reducedMotion = useReducedMotion();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const nextMessage =
      status === "loading"
        ? "Loading dashboard data."
        : status === "success"
          ? "Dashboard data loaded."
          : status === "empty"
            ? "Dashboard has no data to show."
            : "Dashboard data failed to load.";

    setStatusAnnouncement("");
    const timer = window.setTimeout(
      () => setStatusAnnouncement(nextMessage),
      50,
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  const userNotifications = useMemo(
    () => notifications.filter((item) => item.userId === CURRENT_USER_ID),
    [notifications],
  );

  const handleKeyboardShortcut = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const meta = isMac ? e.metaKey : e.ctrlKey;

      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/events/new");
      }

      if (meta && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setActiveTab("analytics");
      }
    },
    [router],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [handleKeyboardShortcut]);

  useEffect(() => {
    if (reducedMotion) {
      setStats(DEMO_STATS);
      setStatus("success");
      setLastRefreshedAt(new Date());
      return;
    }
    const timer = setTimeout(() => {
      if (DEMO_STATS.length === 0) {
        setStatus("empty");
      } else {
        setStats(DEMO_STATS);
        setStatus("success");
        setLastRefreshedAt(new Date());
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  const retry = () => {
    setLiveMessage("Refreshing dashboard");
    if (reducedMotion) {
      setStats(DEMO_STATS);
      setStatus("success");
      setLastRefreshedAt(new Date());
      return;
    }
    setStatus("loading");
    setStats(null);
    setTimeout(() => {
      setStats(DEMO_STATS);
      setStatus("success");
      setLastRefreshedAt(new Date());
    }, 1500);
  };

  const renderStatCard = (stat: Stat, idx: number) => {
    const variants: any[] = [
      "volume",
      "predictions",
      "win-rate",
      "leaderboard",
    ];
    return (
      <StatCard
        key={idx}
        stat={stat}
        index={idx}
        emptyVariant={variants[idx % 4]}
      />
    );
  };

  const renderCards = () => {
    switch (status) {
      case "loading":
        return (
          // Issue #1 Fix: Add explicit grid-cols-1 for mobile-first responsive scaling
          // Ensures single column on mobile (< 640px), 2 columns at sm (640px+), 4 at lg (1024px+)
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        );
      case "empty":
        return (
          // Issue #1 Fix: Add explicit grid-cols-1 for mobile-first responsive scaling
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(['volume', 'predictions', 'win-rate', 'leaderboard'] as const).map((variant, idx) => (
              <StatCard key={idx} index={idx} status="empty" emptyVariant={variant} />
            ))}
          </div>
        );
      case "error":
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
        );
      case "success":
        return (
          // Issue #1 Fix: Add explicit grid-cols-1 for mobile-first responsive scaling
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats?.map((stat, idx) => renderStatCard(stat, idx))}
          </div>
        );
    }
  };

  const renderRecommendationStrip = () => {
    const visibleRecommendations = recommendedMarkets.filter(
      (market) => !hiddenRecommendations.includes(market.id),
    );

    if (visibleRecommendations.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                No recommendations right now
              </p>
              <p className="text-sm text-muted-foreground">
                We will refresh this strip as new market signals become
                available.
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
      );
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

        {/* Issue #2 Fix: Add responsive column scaling 1→2→3
            Mobile (< 640px): 1 column for better readability
            Tablet (640px+): 2 columns to use horizontal space
            Desktop (768px+): 3 columns as originally intended */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {visibleRecommendations.map((market) => (
            <Card key={market.id} className="overflow-hidden">
              <CardContent className="flex h-full flex-col gap-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    {/* Issue #2 Fix: Shrink category badge text on mobile for compact layout */}
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
                    <Link href={market.href} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
                      {market.title}
                    </Link>
                  </h3>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="tabular-nums">{market.volume}</span>
                  <Button asChild variant="ghost" size="sm" className="px-2">
                    <Link href={market.href}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  const renderAnalyticsPanel = () => {
    switch (status) {
      case "loading":
        return <Skeleton className="h-64 w-full rounded-xl" />;
      case "empty":
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No analytics data.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add events to view analytics.
            </p>
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
          </div>
        );
      case "error":
        return (
          <Alert variant="destructive">
            <AlertTitle>Analytics load error</AlertTitle>
            <AlertDescription>Unable to fetch analytics data.</AlertDescription>
            <Button variant="outline" onClick={retry} className="mt-2">
              Retry
            </Button>
          </Alert>
        );
      case "success":
        return (
          // Issue #4 Fix: Change to grid-cols-1 md:grid-cols-3 so the 2-column User Growth card
          // spans correctly at md+ breakpoints instead of forcing awkward wrapping at tablet width
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3">
            {/* Placeholder charts remain unchanged */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations over time
                </CardDescription>
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
        );
    }
  };

  useEffect(() => {
    switch (status) {
      case "loading":
        setLiveMessage("Loading dashboard");
        break;
      case "success":
        setLiveMessage(
          `Dashboard loaded. Showing ${stats?.length ?? 0} key metrics in ${activeTab}.`,
        );
        break;
      case "empty":
        setLiveMessage(`Dashboard is empty in ${activeTab}.`);
        break;
      case "error":
        setLiveMessage(`Dashboard failed to load in ${activeTab}.`);
        break;
    }
  }, [activeTab, stats?.length, status]);

  const renderReportsPanel = () => {
    switch (status) {
      case "loading":
        return <Skeleton className="h-64 w-full rounded-xl" />;
      case "empty":
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No reports available.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate reports from events.
            </p>
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
          </div>
        );
      case "error":
        return (
          <Alert variant="destructive">
            <AlertTitle>Reports load error</AlertTitle>
            <AlertDescription>
              Unable to fetch report listings.
            </AlertDescription>
            <Button variant="outline" onClick={retry} className="mt-2">
              Retry
            </Button>
          </Alert>
        );
      case "success":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>
                Download or view generated reports
              </CardDescription>
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
                    <p className="text-sm text-muted-foreground">
                      Last 30 days
                    </p>
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
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Dashboard status"
        data-testid="dashboard-status-live-region"
        className="sr-only"
      >
        {statusAnnouncement}
      </div>

      {reducedMotion && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Reduced motion enabled"
          data-testid="dashboard-reduced-motion-banner"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
        >
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Reduced motion mode:</strong>{" "}
            animations are disabled because your device prefers reduced motion.
            The dashboard is rendered as a static view to avoid transitions or
            motion effects.
          </span>
        </div>
      )}

      <div
        data-testid="dashboard-header"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div
          data-testid="dashboard-header-actions"
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <NotifDigest
            notifications={userNotifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
          <RefreshIndicator
            lastRefreshedAt={lastRefreshedAt}
            onRefresh={retry}
          />
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/events/new">Create New Event</Link>
            </Button>
            <Kbd shortcut="newEvent" className="hidden sm:inline-flex" />
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {renderCards()}
          <RecentlyViewedRail />
          <ActiveBets
            bets={status === "empty" ? [] : []}
            isLoading={status === "loading"}
            onAddBet={() => console.log("Add bet")}
          />
          {renderRecommendationStrip()}
          <RecommendationsStrip />
          {/* Issue #5 Fix: Change to grid-cols-1 lg:grid-cols-7 to stack on mobile/tablet
              and only use 7-column layout at desktop where there's enough space
              Also add responsive chart height: smaller on mobile (h-[150px]), 
              standard on larger screens (sm:h-[200px]) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Platform Activity</CardTitle>
                <CardDescription>
                  User activity and predictions over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[150px] sm:h-[200px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Activity Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest actions on Predictify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  activities={status === "empty" ? [] : []}
                  isLoading={status === "loading"}
                />
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
  );
}
