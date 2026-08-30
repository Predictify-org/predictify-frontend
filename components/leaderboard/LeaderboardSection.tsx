"use client";

import React, { useState } from "react";
import { mockLeaderboardData } from "@/lib/leaderboard-data";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardCards } from "./LeaderboardCards";
import { YourRankChip } from "./YourRankChip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import {
  LeaderboardEmptyState,
  LeaderboardErrorState,
  LeaderboardLoadingState,
} from "./leaderboard-states";
import { cn } from "@/lib/utils";

export function LeaderboardSection() {
  const [activeTab, setActiveTab] = useState("all-time");
  const [isUserVisible, setIsUserVisible] = useState(true);

  const fetcher = React.useCallback(async () => {
    const res = await fetch(`/api/leaderboard?period=${activeTab}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("You do not have permission to view this leaderboard.");
      }
      let errorMessage = `Failed to load leaderboard (${res.status})`;
      try {
        const data = await res.json();
        if (data && data.error) errorMessage = data.error;
      } catch (e) {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }
    return res.json();
  }, [activeTab]);

  const { status, data, error, refetch, retry } = useLeaderboard({
    fetcher,
    initialData: mockLeaderboardData,
    staleTime: 2 * 60 * 1000,
  });

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const users = data.length > 0 ? data : mockLeaderboardData;
  const topThree = users.slice(0, 3);
  const others = users.slice(3);
  const currentUser = users.find((u) => u.isCurrentUser);

  const isLoading = status === "loading";
  const isError = status === "error";
  const isEmpty = status === "empty";
  const showFallbackData = isError || isEmpty;

  if (isLoading && data.length === 0) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Top <span className="text-cyan-400">Predictors</span>
            </h1>
            <p className="text-slate-400 text-sm">
              Ranked by total profit and accuracy across all markets.
            </p>
          </div>

          <Tabs defaultValue="all-time" className="w-full md:w-auto" onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="all-time">All-Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <LeaderboardLoadingState message="Loading leaderboard rankings..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Top <span className="text-cyan-400">Predictors</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Ranked by total profit and accuracy across all markets.
          </p>
        </div>

        <Tabs defaultValue="all-time" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="all-time">All-Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isError && (
        <LeaderboardErrorState
          error={error || undefined}
          onRetry={async () => {
            await retry();
            if (status === "empty") {
              await refetch();
            }
          }}
        />
      )}

      {isEmpty && !isError && (
        <LeaderboardEmptyState
          onRetry={refetch}
        />
      )}

      {showFallbackData && (
        <div className="text-xs text-slate-500 text-center" role="note">
          Showing cached rankings while refreshing.
        </div>
      )}

      {/* Mobile-only Podium */}
      <div className={isEmpty ? "hidden" : "md:hidden"}>
        <LeaderboardPodium topThree={topThree} />
      </div>

      {/* Desktop view: Full table includes top 3 */}
      <div className={isEmpty ? "hidden" : "hidden md:block"}>
        <LeaderboardTable users={users} onUserVisibilityChange={setIsUserVisible} />
      </div>

      {/* Mobile view: Podium + Cards for others */}
      <div className={isEmpty ? "hidden" : "md:hidden space-y-4"}>
        <div className="px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Rankings</h2>
            <LeaderboardCards users={others} onUserVisibilityChange={setIsUserVisible} />
        </div>
      </div>

      {currentUser && (
        <YourRankChip user={currentUser} isVisible={isUserVisible} />
      )}
    </div>
  );
}
