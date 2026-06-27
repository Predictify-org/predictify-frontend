"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TAB_VALUES = ["overview", "activity", "resolution"] as const;
type TabValue = (typeof TAB_VALUES)[number];

interface MarketDetailTabsProps {
  overview: React.ReactNode;
  activity: React.ReactNode;
  resolution: React.ReactNode;
  defaultValue?: TabValue;
}

export function MarketDetailTabs({
  overview,
  activity,
  resolution,
  defaultValue = "overview",
}: MarketDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab");
  const activeTab = TAB_VALUES.includes(rawTab as TabValue)
    ? (rawTab as TabValue)
    : defaultValue;

  function onTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="resolution">Resolution</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="resolution">{resolution}</TabsContent>
    </Tabs>
  );
}
