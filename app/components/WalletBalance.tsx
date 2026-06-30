"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WalletBalanceProps = {
  /** Resolver for the current balance, e.g. an on-chain query. */
  fetchBalance: () => Promise<string>;
  /** Asset code shown next to the amount. */
  assetCode?: string;
  /** Poll interval in milliseconds (defaults to 15s). */
  pollIntervalMs?: number;
};

type Status = "loading" | "idle" | "error";

/**
 * Displays a wallet balance that refreshes on an interval, with a live
 * "refreshing" indicator and a manual refresh control. The polling timer is
 * cleared on unmount so it never leaks or updates an unmounted component.
 */
export function WalletBalance({
  fetchBalance,
  assetCode = "XLM",
  pollIntervalMs = 15_000,
}: WalletBalanceProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const next = await fetchBalance();
      if (!mounted.current) return;
      setBalance(next);
      setStatus("idle");
    } catch {
      if (!mounted.current) return;
      setStatus("error");
    }
  }, [fetchBalance]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const id = setInterval(() => void refresh(), pollIntervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh, pollIntervalMs]);

  return (
    <div className="wallet-balance" aria-live="polite">
      <span className="wallet-balance__amount">
        {balance === null ? "—" : `${balance} ${assetCode}`}
      </span>
      {status === "loading" && (
        <span
          className="wallet-balance__indicator"
          role="status"
          aria-label="Refreshing balance"
        >
          ⟳
        </span>
      )}
      {status === "error" && (
        <span className="wallet-balance__error" role="alert">
          Balance unavailable
        </span>
      )}
      <button
        type="button"
        className="wallet-balance__refresh"
        onClick={() => void refresh()}
        aria-label="Refresh balance now"
      >
        Refresh
      </button>
    </div>
  );
}
