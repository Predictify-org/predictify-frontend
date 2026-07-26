"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

type SortKey = "rank" | "name" | "profit" | "winRate" | "predictions";

type LeaderboardTableUser = LeaderboardUser & {
  /** Optional source image used for the user's leaderboard avatar. */
  avatar?: string;
  avatarUrl?: string;
  image?: string;
  imageUrl?: string;
};

interface LeaderboardTableProps {
  users: LeaderboardTableUser[];
}

const AVATAR_WIDTHS = [48, 96, 192] as const;

function getAvatarSource(user: LeaderboardTableUser): string | undefined {
  return user.avatarUrl ?? user.avatar ?? user.imageUrl ?? user.image;
}

function getResponsiveImageSource(source: string, width: number): string {
  const hashIndex = source.indexOf("#");
  const sourceWithoutHash = hashIndex === -1 ? source : source.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : source.slice(hashIndex);
  const separator = sourceWithoutHash.includes("?") ? "&" : "?";

  return `${sourceWithoutHash}${separator}w=${width}${hash}`;
}

function formatProfit(profit: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(profit);
}

export function LeaderboardTable({ users }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDescending, setSortDescending] = useState(true);
  const scrollParentRef = useRef<HTMLDivElement>(null);

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

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDescending((descending) => !descending);
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
    <div
      ref={scrollParentRef}
      className="max-h-[32rem] overflow-auto rounded-lg border border-border"
    >
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <caption className="sr-only">Leaderboard rankings</caption>
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-border text-sm text-muted-foreground">
            <th scope="col" className="px-4 py-3">
              {sortButton("rank", "rank")}
            </th>
            <th scope="col" className="px-4 py-3">
              {sortButton("name", "name")}
            </th>
            <th scope="col" className="px-4 py-3">
              {sortButton("profit", "profit")}
            </th>
            <th scope="col" className="px-4 py-3">
              {sortButton("winRate", "win rate")}
            </th>
            <th scope="col" className="px-4 py-3">
              {sortButton("predictions", "predictions")}
            </th>
          </tr>
        </thead>
        <tbody
          className="relative block"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
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
        </tbody>
      </table>
    </div>
  );
}
