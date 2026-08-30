"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getHorizonUrl } from "@/lib/stellar/transaction";

const POLL_INTERVAL_MS = 15_000;

interface StellarBalanceResult {
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useStellarBalance(address: string | null): StellarBalanceResult {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const horizonUrl = getHorizonUrl();
      const response = await fetch(`${horizonUrl}/accounts/${addr}`);

      if (!response.ok) {
        if (response.status === 404) {
          setBalance("0.0000000");
          return;
        }
        throw new Error(`Horizon error: ${response.status}`);
      }

      const data = await response.json();
      const nativeBalance = data.balances?.find(
        (b: { asset_type: string }) => b.asset_type === "native",
      );

      setBalance(nativeBalance ? nativeBalance.balance : "0.0000000");
    } catch (err) {
      const message = (err as Error)?.message || "Failed to fetch balance";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    fetchBalance(address);

    intervalRef.current = setInterval(() => {
      fetchBalance(address);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [address, fetchBalance]);

  return { balance, isLoading, error };
}
