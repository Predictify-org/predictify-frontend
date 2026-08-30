/**
 * bookmarks.ts
 *
 * Client-side store for tracking which markets the current user has bookmarked.
 * Persisted to localStorage so bookmarks survive page refreshes.
 * Used by the BookmarkButton component for the GrantFox FWC26 campaign.
 *
 * Usage:
 *   const { isBookmarked, bookmark, unbookmark, toggle } = useBookmarksStore();
 *   isBookmarked("market-id") // → boolean
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarksState {
  /** Set of market IDs the user has bookmarked. */
  bookmarkedIds: Set<string>;
  /** Returns true when the given market ID is in the bookmarked set. */
  isBookmarked: (marketId: string) => boolean;
  /** Add a market ID to the bookmarked set. */
  bookmark: (marketId: string) => void;
  /** Remove a market ID from the bookmarked set. */
  unbookmark: (marketId: string) => void;
  /** Toggle bookmark state; returns the new state (true = now bookmarked). */
  toggle: (marketId: string) => boolean;
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
    }),
    {
      name: "predictify-bookmarks",
      // Zustand persist doesn't serialise Set natively — convert to/from array.
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
