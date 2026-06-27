"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LeaderboardUser } from "@/lib/leaderboard-data";

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  onUserVisibilityChange?: (isVisible: boolean) => void;
}

export function LeaderboardTable({ users, onUserVisibilityChange }: LeaderboardTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const currentUserIndex = users.findIndex(u => u.isCurrentUser);

  React.useEffect(() => {
    if (onUserVisibilityChange) {
      const isVisible = rowVirtualizer.getVirtualItems().some((vi: any) => vi.index === currentUserIndex);
      onUserVisibilityChange(isVisible);
    }
  }, [rowVirtualizer.getVirtualItems(), currentUserIndex, onUserVisibilityChange]);

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
            <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Profit (XLM)</th>
              <th className="px-6 py-4">Win Rate</th>
              <th className="px-6 py-4">Predictions</th>
            </tr>
          </thead>
        </table>
      </div>
      
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const user = users[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className={cn(
                  "absolute top-0 left-0 w-full flex items-center border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors",
                  user.isCurrentUser && "bg-cyan-500/5 border-cyan-500/20"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="px-6 w-20 text-slate-400 font-mono text-sm">
                   #{user.rank}
                </div>
                <div className="px-6 flex-1 flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-slate-700">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className={cn("text-sm font-medium", user.isCurrentUser ? "text-cyan-400" : "text-white")}>
                    {user.name}
                  </span>
                </div>
                <div className="px-6 w-36 text-sm font-semibold text-emerald-400">
                  +{user.profit.toLocaleString()}
                </div>
                <div className="px-6 w-32 text-sm text-slate-300">
                  {user.winRate}%
                </div>
                <div className="px-6 w-32 text-sm text-slate-400">
                  {user.predictions}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
