"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const TAB_VALUES = [
  "overview",
  "odds",
  "activity",
  "resolution",
  "timeline",
] as const;
export type TabValue = (typeof TAB_VALUES)[number];

interface MarketDetailTabsProps {
  overview: React.ReactNode;
  odds?: React.ReactNode;
  activity: React.ReactNode;
  resolution: React.ReactNode;
  timeline: React.ReactNode;
  defaultValue?: TabValue;
}

export function MarketDetailTabs({
  overview,
  odds,
  activity,
  resolution,
  timeline,
  defaultValue = "overview",
}: MarketDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const hasOdds = odds !== undefined;
  const availableTabs: readonly TabValue[] = hasOdds
    ? TAB_VALUES
    : TAB_VALUES.filter((tab) => tab !== "odds");

  const rawTab = searchParams.get("tab");
  const activeTab = availableTabs.includes(rawTab as TabValue)
    ? (rawTab as TabValue)
    : defaultValue;

  function onTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      {/*
       * Mobile scroll: on narrow viewports the tab triggers can overflow
       * the container. `overflow-x-auto` + `scrollbar-hide` lets the strip
       * scroll horizontally without showing an ugly scrollbar, while keeping
       * all tabs reachable via touch/keyboard.
       * `min-w-max` on the inner list ensures the triggers never wrap or shrink.
       */}
      <div className="overflow-x-auto scrollbar-hide">
        <TabsList className="min-w-max w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasOdds && <TabsTrigger value="odds">Odds</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="resolution">Resolution</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">{overview}</TabsContent>
      {hasOdds && <TabsContent value="odds">{odds}</TabsContent>}
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="resolution">{resolution}</TabsContent>
      <TabsContent value="timeline">{timeline}</TabsContent>
    </Tabs>
  );
}
