"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LeaderboardEmptyState } from "./leaderboard-states";
import { LeaderboardUser } from "@/lib/leaderboard-data";

interface LeaderboardCardsProps {
  users: LeaderboardUser[];
  onUserVisibilityChange?: (isVisible: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function LeaderboardCards({ users, onUserVisibilityChange, isLoading, error, onRetry }: LeaderboardCardsProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/40"
          >
            <div className="w-6 h-4 rounded bg-slate-800 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
              <div className="h-3 w-20 rounded bg-slate-800 animate-pulse" />
            </div>
            <div className="w-16 h-4 rounded bg-slate-800 animate-pulse hidden sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <LeaderboardErrorState
        error={error}
        onRetry={onRetry}
        className="rounded-2xl border border-slate-800"
      />
    );
  }

  if (users.length === 0) {
    return (
      <LeaderboardEmptyState
        onRetry={onRetry}
        className="rounded-2xl border border-slate-800"
      />
    );
  }

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const currentUserIndex = users.findIndex(u => u.isCurrentUser);

  React.useEffect(() => {
    if (onUserVisibilityChange) {
      const isVisible = rowVirtualizer.getVirtualItems().some((vi: any) => vi.index === currentUserIndex);
      onUserVisibilityChange(isVisible);
    }
  }, [rowVirtualizer.getVirtualItems(), currentUserIndex, onUserVisibilityChange]);

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto space-y-4 px-2"
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
                "absolute top-0 left-0 w-full p-4 mb-3 rounded-xl border transition-all",
                user.isCurrentUser 
                  ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
                  : "bg-slate-900/40 border-slate-800"
              )}
              style={{
                height: `72px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-slate-500 w-6">
                  {user.rank}
                </div>
                <Avatar className="h-10 w-10 border border-slate-700">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold truncate", user.isCurrentUser ? "text-cyan-400" : "text-white")}>
                    {user.name}
                  </p>
                   <p className="text-[10px] text-slate-500 uppercase tracking-wider tabular-nums">
                    {user.predictions} predictions
                  </p>
                </div>
                <div className="text-right text-sm">
                   <p className="font-bold text-emerald-400 tabular-nums">+{user.profit}</p>
                   <p className="text-[10px] text-slate-400 tabular-nums">{user.winRate}% SR</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
