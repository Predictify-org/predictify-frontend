/**
 * follows.ts
 *
 * Client-side store for tracking which markets the current user follows.
 * Persisted to localStorage so the indicator survives page refreshes.
 *
 * Usage:
 *   const { isFollowing, follow, unfollow } = useFollowsStore();
 *   isFollowing("market-id") // → boolean
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FollowsState {
  /** Set of market IDs the user currently follows. */
  followedIds: Set<string>;
  /** Returns true when the given market ID is in the followed set. */
  isFollowing: (marketId: string) => boolean;
  /** Add a market ID to the followed set. */
  follow: (marketId: string) => void;
  /** Remove a market ID from the followed set. */
  unfollow: (marketId: string) => void;
  /** Toggle follow state; returns the new state (true = now following). */
  toggle: (marketId: string) => boolean;
}

export const useFollowsStore = create<FollowsState>()(
  persist(
    (set, get) => ({
      followedIds: new Set<string>(),

      isFollowing: (marketId) => get().followedIds.has(marketId),

      follow: (marketId) =>
        set((state) => ({
          followedIds: new Set([...state.followedIds, marketId]),
        })),

      unfollow: (marketId) =>
        set((state) => {
          const next = new Set(state.followedIds);
          next.delete(marketId);
          return { followedIds: next };
        }),

      toggle: (marketId) => {
        const following = get().isFollowing(marketId);
        if (following) {
          get().unfollow(marketId);
        } else {
          get().follow(marketId);
        }
        return !following;
      },
    }),
    {
      name: "predictify-follows",
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
              followedIds: new Set<string>(parsed.state.followedIds ?? []),
            },
          };
        },
        setItem: (key, value) => {
          const serialisable = {
            ...value,
            state: {
              ...value.state,
              followedIds: [...(value.state.followedIds as Set<string>)],
            },
          };
          localStorage.setItem(key, JSON.stringify(serialisable));
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
