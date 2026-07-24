/**
 * userLimits.ts
 *
 * Client-side store for per-user daily betting limit state.
 * This store surfaces the remaining allowance per market so the UI can
 * nudge the user before they place a bet.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserLimitsState {
  remainingDailyAllowance: Record<string, number>;
  getRemainingDailyAllowance: (marketId: string) => number;
  setRemainingDailyAllowance: (marketId: string, amount: number) => void;
  decrementDailyAllowance: (marketId: string, amount: number) => void;
  reset: () => void;
}

const defaultRemainingDailyAllowance: Record<string, number> = {
  "btc-price": 120,
  "us-election": 240,
  "tesla-earnings": 90,
};

export const useUserLimitsStore = create<UserLimitsState>()(
  persist(
    (set, get) => ({
      remainingDailyAllowance: defaultRemainingDailyAllowance,

      getRemainingDailyAllowance: (marketId) =>
        get().remainingDailyAllowance[marketId] ?? 0,

      setRemainingDailyAllowance: (marketId, amount) =>
        set((state) => ({
          remainingDailyAllowance: {
            ...state.remainingDailyAllowance,
            [marketId]: Math.max(0, amount),
          },
        })),

      decrementDailyAllowance: (marketId, amount) =>
        set((state) => ({
          remainingDailyAllowance: {
            ...state.remainingDailyAllowance,
            [marketId]: Math.max(
              0,
              (state.remainingDailyAllowance[marketId] ?? 0) - amount,
            ),
          },
        })),

      reset: () =>
        set({
          remainingDailyAllowance: defaultRemainingDailyAllowance,
        }),
    }),
    {
      name: "predictify-user-limits",
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        },
        setItem: (key, value) => {
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        },
      },
    },
  ),
);
