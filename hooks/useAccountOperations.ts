'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_OPERATIONS_LIMIT,
  fetchAccountOperations,
  type NormalizedOperation,
} from '@/lib/stellar/operations';

export interface UseAccountOperationsOptions {
  limit?: number;
}

export interface UseAccountOperationsResult {
  operations: NormalizedOperation[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  retry: () => void;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return false;
}

function appendUniqueOperations(
  existing: NormalizedOperation[],
  incoming: NormalizedOperation[]
): NormalizedOperation[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((op) => op.id));
  const merged = [...existing];
  for (const op of incoming) {
    if (!seen.has(op.id)) {
      seen.add(op.id);
      merged.push(op);
    }
  }
  return merged;
}

export function useAccountOperations(
  address: string | null,
  options: UseAccountOperationsOptions = {}
): UseAccountOperationsResult {
  const limit = options.limit ?? DEFAULT_OPERATIONS_LIMIT;

  const [operations, setOperations] = useState<NormalizedOperation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAddressRef = useRef<string | null>(address);
  const isLoadingMoreRef = useRef(false);

  const abortInFlight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const loadFirstPage = useCallback(
    async (targetAddress: string) => {
      abortInFlight();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
      setError(null);

      try {
        const result = await fetchAccountOperations({
          address: targetAddress,
          limit,
          signal: controller.signal,
        });

        if (controller.signal.aborted || activeAddressRef.current !== targetAddress) {
          return;
        }

        setOperations(result.records);
        setNextCursor(result.nextCursor);
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          activeAddressRef.current !== targetAddress
        ) {
          return;
        }
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to load account operations';
        setError(message);
      } finally {
        if (!controller.signal.aborted && activeAddressRef.current === targetAddress) {
          setIsLoading(false);
        }
      }
    },
    [abortInFlight, limit]
  );

  useEffect(() => {
    activeAddressRef.current = address;

    if (!address) {
      abortInFlight();
      setOperations([]);
      setNextCursor(null);
      setError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
      return;
    }

    setOperations([]);
    setNextCursor(null);
    void loadFirstPage(address);

    return () => {
      abortInFlight();
    };
  }, [address, abortInFlight, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!address || !nextCursor || isLoading || isLoadingMoreRef.current) {
      return;
    }

    const targetAddress = address;
    const cursorToFetch = nextCursor;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      const result = await fetchAccountOperations({
        address: targetAddress,
        cursor: cursorToFetch,
        limit,
        signal: controller.signal,
      });

      if (controller.signal.aborted || activeAddressRef.current !== targetAddress) {
        return;
      }

      setOperations((prev) => appendUniqueOperations(prev, result.records));
      setNextCursor(result.nextCursor);
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        isAbortError(err) ||
        activeAddressRef.current !== targetAddress
      ) {
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to load more operations';
      setError(message);
    } finally {
      if (!controller.signal.aborted && activeAddressRef.current === targetAddress) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [address, isLoading, limit, nextCursor]);

  const retry = useCallback(() => {
    if (!address) return;
    if (operations.length === 0) {
      void loadFirstPage(address);
    } else if (nextCursor) {
      void loadMore();
    } else {
      void loadFirstPage(address);
    }
  }, [address, loadFirstPage, loadMore, nextCursor, operations.length]);

  return {
    operations,
    isLoading,
    isLoadingMore,
    error,
    hasMore: Boolean(nextCursor),
    loadMore,
    retry,
  };
}
