"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CreatedMarket, CreatorAction } from "@/lib/creator";

export interface CreatorMarketsProvider {
  listByCreator(address: string): Promise<CreatedMarket[]>;
  applyConfirmedAction(
    address: string,
    marketId: string,
    action: CreatorAction
  ): Promise<void>;
}

const mockMarketsByAddress = new Map<string, CreatedMarket[]>();

export const mockCreatorMarketsProvider: CreatorMarketsProvider = {
  async listByCreator(address) {
    return (mockMarketsByAddress.get(address) ?? []).map((market) => ({ ...market }));
  },
  async applyConfirmedAction(address, marketId, action) {
    const markets = mockMarketsByAddress.get(address) ?? [];
    const status: CreatedMarket["status"] =
      action === "cancel_market" ? "cancelled" : "pending_resolution";
    mockMarketsByAddress.set(
      address,
      markets.map((market) =>
        market.id === marketId
          ? { ...market, status }
          : market
      )
    );
  },
};

export function setMockCreatorMarkets(address: string, markets: CreatedMarket[]) {
  mockMarketsByAddress.set(address, markets.map((market) => ({ ...market })));
}

export function useCreatorMarkets(
  address: string | null,
  provider: CreatorMarketsProvider = mockCreatorMarketsProvider
) {
  const [markets, setMarkets] = useState<CreatedMarket[]>([]);
  const [loadedAddress, setLoadedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(address));
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!address) {
      setMarkets([]);
      setLoadedAddress(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextMarkets = await provider.listByCreator(address);
      if (requestId.current === currentRequestId) {
        setMarkets(nextMarkets);
        setLoadedAddress(address);
      }
    } catch (loadError: unknown) {
      if (requestId.current === currentRequestId) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your created markets."
        );
      }
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false);
    }
  }, [address, provider]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  const applyConfirmedAction = useCallback(
    async (marketId: string, action: CreatorAction) => {
      if (!address) throw new Error("Connect a wallet to manage markets.");
      await provider.applyConfirmedAction(address, marketId, action);
      await refresh();
    },
    [address, provider, refresh]
  );

  return {
    markets: loadedAddress === address ? markets : [],
    isLoading: Boolean(address) && (isLoading || loadedAddress !== address),
    error,
    refresh,
    applyConfirmedAction,
  } as const;
}
