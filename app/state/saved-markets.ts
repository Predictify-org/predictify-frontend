"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SAVED_MARKETS_STORAGE_KEY = "predictify-saved-markets";

interface SavedMarketsState {
  savedIds: Set<string>;
  isSaved: (marketId: string) => boolean;
  save: (marketId: string) => void;
  unsave: (marketId: string) => void;
  toggle: (marketId: string) => boolean;
}

export const useSavedMarketsStore = create<SavedMarketsState>()(
  persist(
    (set, get) => ({
      savedIds: new Set<string>(),
      isSaved: (marketId) => get().savedIds.has(marketId),
      save: (marketId) =>
        set((state) => ({
          savedIds: new Set([...state.savedIds, marketId]),
        })),
      unsave: (marketId) =>
        set((state) => {
          const next = new Set(state.savedIds);
          next.delete(marketId);
          return { savedIds: next };
        }),
      toggle: (marketId) => {
        const saved = get().isSaved(marketId);
        if (saved) get().unsave(marketId);
        else get().save(marketId);
        return !saved;
      },
    }),
    {
      name: SAVED_MARKETS_STORAGE_KEY,
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") return null;
          try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const ids = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.state?.savedIds)
                ? parsed.state.savedIds
                : [];
            return {
              state: {
                savedIds: new Set<string>(ids),
              },
              version: parsed?.version ?? 0,
            };
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          if (typeof window === "undefined") return;
          const ids = value.state.savedIds as Set<string>;
          window.localStorage.setItem(
            key,
            JSON.stringify({ state: { savedIds: [...ids] }, version: value.version })
          );
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") window.localStorage.removeItem(key);
        },
      },
    }
  )
);
