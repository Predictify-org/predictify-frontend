"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMarketActivity,
  MarketActivityEvent,
  MarketActivityFetcher,
} from "@/lib/stellar/market-activity";

export interface UseMarketActivityOptions {
  marketId: string;
  limit?: number;
  fetcher?: MarketActivityFetcher;
  enabled?: boolean;
}

export interface UseMarketActivityResult {
  events: MarketActivityEvent[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasNextPage: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMarketActivity({
  marketId,
  limit = 20,
  fetcher,
  enabled = true,
}: UseMarketActivityOptions): UseMarketActivityResult {
  const [events, setEvents] = useState<MarketActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(enabled && marketId));
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Keep a reference to current in-flight abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track current marketId to guard against race conditions
  const currentMarketIdRef = useRef<string>(marketId);
  currentMarketIdRef.current = marketId;

  // Track event IDs to ensure strict deduplication across pages
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Deduplicate and update state
  const appendEvents = useCallback(
    (newEvents: MarketActivityEvent[], isInitial: boolean) => {
      if (isInitial) {
        const unique: MarketActivityEvent[] = [];
        const seen = new Set<string>();
        for (const ev of newEvents) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            unique.push(ev);
          }
        }
        seenIdsRef.current = seen;
        setEvents(unique);
      } else {
        setEvents((prev) => {
          const unique: MarketActivityEvent[] = [...prev];
          for (const ev of newEvents) {
            if (!seenIdsRef.current.has(ev.id)) {
              seenIdsRef.current.add(ev.id);
              unique.push(ev);
            }
          }
          return unique;
        });
      }
    },
    []
  );

  const fetchInitial = useCallback(async () => {
    if (!enabled || !marketId) {
      setEvents([]);
      setIsLoading(false);
      setIsLoadingMore(false);
      setError(null);
      setNextCursor(null);
      setHasNextPage(false);
      seenIdsRef.current.clear();
      return;
    }

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const page = await fetchMarketActivity({
        marketId,
        limit,
        signal: controller.signal,
        fetcher,
      });

      if (controller.signal.aborted || currentMarketIdRef.current !== marketId) {
        return;
      }

      appendEvents(page.events, true);
      setNextCursor(page.nextCursor ?? null);
      setHasNextPage(Boolean(page.nextCursor));
      setError(null);
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted && currentMarketIdRef.current === marketId) {
        setIsLoading(false);
      }
    }
  }, [enabled, marketId, limit, fetcher, appendEvents]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasNextPage || !nextCursor || !marketId) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingMore(true);

    try {
      const page = await fetchMarketActivity({
        marketId,
        cursor: nextCursor,
        limit,
        signal: controller.signal,
        fetcher,
      });

      if (controller.signal.aborted || currentMarketIdRef.current !== marketId) {
        return;
      }

      appendEvents(page.events, false);
      setNextCursor(page.nextCursor ?? null);
      setHasNextPage(Boolean(page.nextCursor));
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted && currentMarketIdRef.current === marketId) {
        setIsLoadingMore(false);
      }
    }
  }, [
    isLoading,
    isLoadingMore,
    hasNextPage,
    nextCursor,
    marketId,
    limit,
    fetcher,
    appendEvents,
  ]);

  const retry = useCallback(async () => {
    if (events.length === 0) {
      await fetchInitial();
    } else {
      await loadMore();
    }
  }, [events.length, fetchInitial, loadMore]);

  const refresh = useCallback(async () => {
    await fetchInitial();
  }, [fetchInitial]);

  // Initial load and marketId change trigger
  useEffect(() => {
    fetchInitial();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchInitial]);

  return {
    events,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    nextCursor,
    loadMore,
    retry,
    refresh,
  };
}
