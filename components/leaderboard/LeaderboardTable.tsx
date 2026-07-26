"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownUp, ArrowUp, ArrowDown, ArrowUpCircle, Share2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeaderboardUser } from "@/lib/leaderboard-data";

type SortKey = "rank" | "name" | "profit" | "winRate" | "predictions";

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  onUserVisibilityChange?: (isVisible: boolean) => void;
  onShare?: () => void;
}

const sortLabels: Record<SortKey, string> = {
  rank: "Rank",
  profit: "Profit (XLM)",
  winRate: "Win Rate",
  predictions: "Predictions",
};

export function LeaderboardTable({ users, onUserVisibilityChange, onShare }: LeaderboardTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("profit");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const comparison =
        typeof leftValue === "string" && typeof rightValue === "string"
          ? leftValue.localeCompare(rightValue)
          : Number(leftValue) - Number(rightValue);

      return sortDescending ? -comparison : comparison;
    });
  }, [sortKey, sortDescending, users]);

  const rowVirtualizer = useVirtualizer({
    count: sortedUsers.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  const currentUserIndex = sortedUsers.findIndex((user) => user.isCurrentUser);
  const virtualItems = rowVirtualizer.getVirtualItems();

  React.useEffect(() => {
    if (onUserVisibilityChange) {
      const isVisible = virtualItems.some((vi: { index: number }) => vi.index === currentUserIndex);
      onUserVisibilityChange(isVisible);
    }
  }, [currentUserIndex, onUserVisibilityChange, virtualItems]);

  const handleScroll = useCallback(() => {
    const container = parentRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

    setIsScrolled(scrollTop > 50);
    setIsNearBottom(scrollPercentage > 0.85);
  }, []);

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((currentDirection) => (currentDirection === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDescending(true);
  };

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      className="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Sort by ${label}`}
      aria-pressed={sortKey === key}
      onClick={() => handleSort(key)}
    >
      {label}
      {sortKey === key && (
        <span aria-hidden="true" className="ml-1">
          {sortDescending ? "↓" : "↑"}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-full bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden relative">
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
            const avatarSource = getAvatarSource(user);
            const avatarSrcSet = avatarSource
              ? AVATAR_WIDTHS.map(
                  (width) => `${getResponsiveImageSource(avatarSource, width)} ${width}w`,
                ).join(", ")
              : undefined;

            return (
              <tr
                key={`${user.rank}-${user.name}`}
                className="absolute left-0 grid w-full grid-cols-[4rem_minmax(10rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] items-center border-b border-border last:border-b-0"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <td className="px-4 py-3">{user.rank}</td>
                <td className="flex items-center gap-3 px-4 py-3 font-medium">
                  {avatarSource && avatarSrcSet ? (
                    // A native image is used so this explicit srcSet is passed through unchanged.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSource}
                      srcSet={avatarSrcSet}
                      sizes="(max-width: 640px) 40px, 48px"
                      width={48}
                      height={48}
                      loading="lazy"
                      alt=""
                      aria-hidden="true"
                      className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
                    />
                  ) : null}
                  <span>{user.name}</span>
                </td>
                <td className="px-4 py-3">{formatProfit(user.profit)}</td>
                <td className="px-4 py-3">{user.winRate}%</td>
                <td className="px-4 py-3">{user.predictions}</td>
              </tr>
            );
          })}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="sticky bottom-0 z-20 bg-gradient-to-t from-slate-900 via-slate-900/98 to-transparent pointer-events-none"
          >
            <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 pointer-events-auto">
              <div className="flex items-center justify-between max-w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium text-slate-400 truncate hidden sm:inline">
                    {sortedUsers.length} Predictors
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollToTop}
                    disabled={isNearBottom}
                    className={cn(
                      "gap-1.5 text-xs font-medium transition-colors",
                      isNearBottom
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10"
                    )}
                    aria-label="Scroll to top of leaderboard"
                  >
                    <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Back to top</span>
                  </Button>

                  {onShare && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onShare}
                      className="gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                      aria-label="Share leaderboard rankings"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
