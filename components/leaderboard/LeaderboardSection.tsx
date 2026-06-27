"use client";

import React, { useState, useMemo } from "react";
import { mockLeaderboardData } from "@/lib/leaderboard-data";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardCards } from "./LeaderboardCards";
import { YourRankChip } from "./YourRankChip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LeaderboardSection() {
  const [activeTab, setActiveTab] = useState("all-time");
  
  // Realistically we'd fetch data here based on tab
  const users = mockLeaderboardData;
  const topThree = users.slice(0, 3);
  const others = users.slice(3);
  const currentUser = users.find(u => u.isCurrentUser)!;

  // Tracking user visibility for the sticky chip
  const [isUserVisible, setIsUserVisible] = useState(true);

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

      {/* Mobile-only Podium */}
      <div className="md:hidden">
        <LeaderboardPodium topThree={topThree} />
      </div>

      {/* Desktop view: Full table includes top 3 */}
      <div className="hidden md:block">
        <LeaderboardTable users={users} onUserVisibilityChange={setIsUserVisible} />
      </div>

      {/* Mobile view: Podium + Cards for others */}
      <div className="md:hidden space-y-4">
        <div className="px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Rankings</h2>
            <LeaderboardCards users={others} onUserVisibilityChange={setIsUserVisible} />
        </div>
      </div>

      <YourRankChip user={currentUser} isVisible={isUserVisible} />
    </div>
  );
}
