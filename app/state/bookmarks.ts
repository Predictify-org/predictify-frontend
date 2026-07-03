"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarksState {
  bookmarkedIds: Set<string>;
  isBookmarked: (marketId: string) => boolean;
  bookmark: (marketId: string) => void;
  unbookmark: (marketId: string) => void;
  toggle: (marketId: string) => boolean;
  getCount: () => number;
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarkedIds: new Set<string>(),

      isBookmarked: (marketId) => get().bookmarkedIds.has(marketId),

      bookmark: (marketId) =>
        set((state) => ({
          bookmarkedIds: new Set([...state.bookmarkedIds, marketId]),
        })),

      unbookmark: (marketId) =>
        set((state) => {
          const next = new Set(state.bookmarkedIds);
          next.delete(marketId);
          return { bookmarkedIds: next };
        }),

      toggle: (marketId) => {
        const bookmarked = get().isBookmarked(marketId);
        if (bookmarked) {
          get().unbookmark(marketId);
        } else {
          get().bookmark(marketId);
        }
        return !bookmarked;
      },

      getCount: () => get().bookmarkedIds.size,
    }),
    {
      name: "predictify-bookmarks",
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              bookmarkedIds: new Set<string>(parsed.state.bookmarkedIds ?? []),
            },
          };
        },
        setItem: (key, value) => {
          const serialisable = {
            ...value,
            state: {
              ...value.state,
              bookmarkedIds: [...(value.state.bookmarkedIds as Set<string>)],
            },
          };
          localStorage.setItem(key, JSON.stringify(serialisable));
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
