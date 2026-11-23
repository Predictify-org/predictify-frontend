"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Check, Trash2, Undo2 } from "lucide-react";
import { EmptyState } from "@/app/components/EmptyState";
import { useBookmarksStore } from "@/app/state/bookmarks";
import { useFollowsStore } from "@/app/state/follows";
import { useSavedMarketsStore } from "@/app/state/saved-markets";
import { mockEvents, useEventsStore } from "@/lib/events-store";
import { sampleMarkets } from "@/content/markets.sample";
import {
  buildWatchlist,
  filterWatchlist,
  sortWatchlist,
  type WatchlistRow,
  type WatchlistSource,
  type WatchlistSort,
} from "@/lib/watchlist";

const sourceLabels: Record<WatchlistSource, string> = {
  bookmark: "Bookmarked",
  follow: "Following",
  saved: "Saved",
};

export default function WatchlistPage() {
  const [hydrated, setHydrated] = useState(false);
  const [source, setSource] = useState<WatchlistSource | "all">("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<WatchlistSort>("recently-added");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ rows: WatchlistRow[] } | null>(null);

  const bookmarkedIds = useBookmarksStore((state) => state.bookmarkedIds);
  const followedIds = useFollowsStore((state) => state.followedIds);
  const savedIds = useSavedMarketsStore((state) => state.savedIds);
  const eventMarkets = useEventsStore((state) => state.events);

  useEffect(() => {
    const ready = [
      useBookmarksStore.persist?.hasHydrated(),
      useFollowsStore.persist?.hasHydrated(),
      useSavedMarketsStore.persist?.hasHydrated(),
    ];
    setHydrated(ready.every(Boolean));

    const unsubscribes = [
      useBookmarksStore.persist?.onFinishHydration(() => setHydrated(true)),
      useFollowsStore.persist?.onFinishHydration(() => setHydrated(true)),
      useSavedMarketsStore.persist?.onFinishHydration(() => setHydrated(true)),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  const markets = useMemo(() => {
    const eventSource = eventMarkets?.length ? eventMarkets : mockEvents;
    const eventRows = eventSource.map((market) => ({
      id: market.id,
      title: market.title,
      category: market.category,
      status: market.status,
      endDate: market.endDate,
    }));
    const sampleRows = sampleMarkets.map((market) => ({
      id: market.id,
      title: market.title,
      category: "General",
      status: market.status === "active" ? "ongoing" : market.status,
      endDate: undefined,
    }));
    return [...eventRows, ...sampleRows.filter((sample) =>
      !eventRows.some((event) => event.id === sample.id)
    )];
  }, [eventMarkets]);

  const rows = useMemo(
    () => buildWatchlist({ bookmarkedIds, followedIds, savedIds, markets }),
    [bookmarkedIds, followedIds, savedIds, markets]
  );
  const filtered = useMemo(
    () => sortWatchlist(
      filterWatchlist(rows, { source, category, status }),
      sort
    ),
    [rows, source, category, status, sort]
  );

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => row.category))).sort(),
    [rows]
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.status))).sort(),
    [rows]
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true">
        <p className="text-sm text-slate-400">Loading watchlist...</p>
      </div>
    );
  }

  const toggleSelected = (marketId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(marketId)) next.delete(marketId);
      else next.add(marketId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) => {
      const allVisibleSelected = filtered.length > 0 &&
        filtered.every((row) => current.has(row.marketId));
      return allVisibleSelected
        ? new Set(Array.from(current).filter((id) =>
            !filtered.some((row) => row.marketId === id)
          ))
        : new Set(filtered.map((row) => row.marketId));
    });
  };

  const removeSelected = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} item${selected.size === 1 ? "" : "s"} from every watchlist source?`)) {
      return;
    }

    const removed = rows.filter((row) => selected.has(row.marketId));
    removed.forEach((row) => {
      useBookmarksStore.getState().unbookmark(row.marketId);
      useFollowsStore.getState().unfollow(row.marketId);
      useSavedMarketsStore.getState().unsave(row.marketId);
    });
    setUndo({ rows: removed });
    setSelected(new Set());
  };

  const undoRemove = () => {
    undo?.rows.forEach((row) => {
      if (row.sources.includes("bookmark")) useBookmarksStore.getState().bookmark(row.marketId);
      if (row.sources.includes("follow")) useFollowsStore.getState().follow(row.marketId);
      if (row.sources.includes("saved")) useSavedMarketsStore.getState().save(row.marketId);
    });
    setUndo(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <p className="mt-1 text-sm text-slate-400">Your bookmarks, follows, and saved markets.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" aria-hidden="true" />}
          title="Your watchlist is empty"
          description="Bookmark, follow, or save markets to see them here."
          ctaLabel="Browse markets"
          ctaHref="/markets"
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Source filters">
            {(["all", "bookmark", "follow", "saved"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={source === item}
                onClick={() => setSource(item)}
                className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  source === item
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                {item === "all" ? "All" : sourceLabels[item]}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-300">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="ml-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5"
              >
                <option value="all">All</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="ml-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5"
              >
                <option value="all">All</option>
                {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as WatchlistSort)}
                className="ml-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5"
              >
                <option value="closing-soon">Closing soon</option>
                <option value="recently-added">Recently added</option>
                <option value="title">Title</option>
              </select>
            </label>
            <button
              type="button"
              onClick={removeSelected}
              disabled={selected.size === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove selected
            </button>
          </div>

          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left">
              <thead className="bg-slate-900/70 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all visible watchlist items"
                      checked={filtered.length > 0 && filtered.every((row) => selected.has(row.marketId))}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Sources</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.marketId} className="border-t border-slate-800 text-sm text-slate-200">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        checked={selected.has(row.marketId)}
                        onChange={() => toggleSelected(row.marketId)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{row.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.category}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.sources.map((item) => (
                          <span key={item} className="rounded-full bg-slate-800 px-2 py-1 text-xs">
                            {sourceLabels[item]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 capitalize">{row.status}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                      No watchlist items match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {undo && (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-[60] flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-xl"
        >
          <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-sm text-slate-200">Removed from watchlist</span>
          <button type="button" onClick={undoRemove} className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300">
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
