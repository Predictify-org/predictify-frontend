"use client";

import React from "react";
import { useWalletContext } from "@/context/WalletContext";
import { useStellarBalance } from "@/hooks/useStellarBalance.hook";
import { usePrivacy } from "@/context/PrivacyContext";
import { maskAmount } from "@/utils/maskAmount";
import { Wallet, EyeOff } from "lucide-react";

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Prevent sensitive wallet data from being copied or printed.
const privacyClasses = "select-none print:hidden";

export function WalletBalance({ className = "" }: { className?: string }) {
  const { address, connected } = useWalletContext();
  const { balance, isLoading } = useStellarBalance(connected ? address : null);
  const { hideBalances } = usePrivacy();

  if (!connected || !address) return null;

  if (isLoading && !balance) {
    return (
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 animate-pulse ${className} ${privacyClasses}`}
        aria-label="Loading wallet balance"
      >
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>
    );
  }

  if (hideBalances) {
    return (
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 text-sm font-mono ${className} ${privacyClasses}`}
        aria-label="Wallet balance hidden"
      >
        <Wallet className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
        <span>{maskAmount(balance ?? "")}</span>
        <EyeOff className="h-3 w-3 text-slate-500" aria-hidden="true" />
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 text-sm font-mono ${className} ${privacyClasses}`
      aria-label={`Wallet balance: ${formatBalance(balance)} XLM`}
    >
      <Wallet className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
      <span>{formatBalance(balance)} <span className="text-slate-500">XLM</span></span>
    </div>
  );
}
