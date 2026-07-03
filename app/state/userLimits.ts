import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserMarketLimit {
  dailyLimit: number;
  usedToday: number;
  currency: string;
}

interface UserLimitsState {
  limitsByMarket: Record<string, UserMarketLimit>;
  setLimit: (marketId: string, limit: UserMarketLimit) => void;
  getLimit: (marketId: string) => UserMarketLimit | null;
  getRemaining: (marketId: string) => number | null;
  getUsagePercent: (marketId: string) => number | null;
  getRemainingPercent: (marketId: string) => number | null;
}

const defaultLimitsByMarket: Record<string, UserMarketLimit> = {
  "btc-price": {
    dailyLimit: 500,
    usedToday: 120,
    currency: "USDC",
  },
  "us-election": {
    dailyLimit: 350,
    usedToday: 90,
    currency: "USDC",
  },
  "tesla-earnings": {
    dailyLimit: 250,
    usedToday: 30,
    currency: "USDC",
  },
};

function normalizeLimit(limit: UserMarketLimit): UserMarketLimit {
  return {
    dailyLimit: Math.max(0, limit.dailyLimit),
    usedToday: Math.max(0, limit.usedToday),
    currency: limit.currency,
  };
}

function getPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}

export const useUserLimitsStore = create<UserLimitsState>()(
  persist(
    (set, get) => ({
      limitsByMarket: defaultLimitsByMarket,

      setLimit: (marketId, limit) =>
        set((state) => ({
          limitsByMarket: {
            ...state.limitsByMarket,
            [marketId]: normalizeLimit(limit),
          },
        })),

      getLimit: (marketId) => get().limitsByMarket[marketId] ?? null,

      getRemaining: (marketId) => {
        const limit = get().getLimit(marketId);
        if (!limit) return null;
        return Math.max(0, limit.dailyLimit - limit.usedToday);
      },

      getUsagePercent: (marketId) => {
        const limit = get().getLimit(marketId);
        if (!limit) return null;
        return getPercent(limit.usedToday, limit.dailyLimit);
      },

      getRemainingPercent: (marketId) => {
        const limit = get().getLimit(marketId);
        if (!limit) return null;
        return getPercent(Math.max(0, limit.dailyLimit - limit.usedToday), limit.dailyLimit);
      },
    }),
    {
      name: "predictify-user-limits",
    }
  )
);
