"use client";

import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownUp, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LeaderboardUser } from "@/lib/leaderboard-data";

type SortKey = "rank" | "profit" | "winRate" | "predictions";
type SortDirection = "asc" | "desc";

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  onUserVisibilityChange?: (isVisible: boolean) => void;
}

const sortLabels: Record<SortKey, string> = {
  rank: "Rank",
  profit: "Profit (XLM)",
  winRate: "Win Rate",
  predictions: "Predictions",
};

export function LeaderboardTable({ users, onUserVisibilityChange }: LeaderboardTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("profit");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const directionMultiplier = sortDirection === "desc" ? -1 : 1;

      switch (sortKey) {
        case "profit":
          return (a.profit - b.profit) * directionMultiplier;
        case "winRate":
          return (a.winRate - b.winRate) * directionMultiplier;
        case "predictions":
          return (a.predictions - b.predictions) * directionMultiplier;
        case "rank":
        default:
          return (a.rank - b.rank) * directionMultiplier;
      }
    });

    return sorted;
  }, [sortDirection, sortKey, users]);

  const rowVirtualizer = useVirtualizer({
    count: sortedUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const currentUserIndex = sortedUsers.findIndex((user) => user.isCurrentUser);
  const virtualItems = rowVirtualizer.getVirtualItems();

  React.useEffect(() => {
    if (onUserVisibilityChange) {
      const isVisible = virtualItems.some((vi: { index: number }) => vi.index === currentUserIndex);
      onUserVisibilityChange(isVisible);
    }
  }, [currentUserIndex, onUserVisibilityChange, virtualItems]);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((currentDirection) => (currentDirection === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortKey !== columnKey) {
      return <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    if (sortDirection === "desc") {
      return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
    }

    return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  };

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900/95 shadow-sm backdrop-blur">
            <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th scope="col" className="px-6 py-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("rank")}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label={`Sort by ${sortLabels.rank.toLowerCase()}`}
                  aria-pressed={sortKey === "rank"}
                >
                  <span>{sortLabels.rank}</span>
                  {renderSortIcon("rank")}
                </button>
              </th>
              <th scope="col" className="px-6 py-4">User</th>
              <th scope="col" className="px-6 py-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("profit")}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label={`Sort by ${sortLabels.profit.toLowerCase()}`}
                  aria-pressed={sortKey === "profit"}
                >
                  <span>{sortLabels.profit}</span>
                  {renderSortIcon("profit")}
                </button>
              </th>
              <th scope="col" className="px-6 py-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("winRate")}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label={`Sort by ${sortLabels.winRate.toLowerCase()}`}
                  aria-pressed={sortKey === "winRate"}
                >
                  <span>{sortLabels.winRate}</span>
                  {renderSortIcon("winRate")}
                </button>
              </th>
              <th scope="col" className="px-6 py-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("predictions")}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label={`Sort by ${sortLabels.predictions.toLowerCase()}`}
                  aria-pressed={sortKey === "predictions"}
                >
                  <span>{sortLabels.predictions}</span>
                  {renderSortIcon("predictions")}
                </button>
              </th>
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
            const user = sortedUsers[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                role="row"
                className={cn(
                  "absolute top-0 left-0 w-full flex items-center border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors",
                  user.isCurrentUser && "bg-cyan-500/5 border-cyan-500/20"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div role="cell" className="px-6 w-20 text-slate-400 font-mono text-sm">
                  #{virtualRow.index + 1}
                </div>
                <div role="cell" className="px-6 flex-1 flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-slate-700">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className={cn("text-sm font-medium", user.isCurrentUser ? "text-cyan-400" : "text-white")}>
                    {user.name}
                  </span>
                </div>
                <div className="px-6 w-36 text-sm font-semibold text-emerald-400 tabular-nums">
                  +{user.profit.toLocaleString()}
                </div>
                <div className="px-6 w-32 text-sm text-slate-300 tabular-nums">
                  {user.winRate}%
                </div>
                <div className="px-6 w-32 text-sm text-slate-400 tabular-nums">
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
