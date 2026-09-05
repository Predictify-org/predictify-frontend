"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StellarIcon, ArrowDown } from "../icons";
import { getNetworkTint } from "@/lib/network-tint";

interface NetworkSwitcherProps {
  network: string;
  onChange?: (next: string) => void;
  className?: string;
  /** The network currently connected in the user's wallet, if known. */
  walletNetwork?: string;
  /** Called when the user selects a network that differs from `walletNetwork`. */
  onMismatch?: (next: string) => void;
}

const NETWORKS = ["Mainnet", "Testnet", "Futurenet"] as const;
type Network = (typeof NETWORKS)[number];

function isNetwork(value: string): value is Network {
  return (NETWORKS as readonly string[]).includes(value);
}

export function NetworkSwitcher({ network, onChange, className, walletNetwork, onMismatch }: NetworkSwitcherProps) {
  const safeNetwork: string = isNetwork(network) ? network : NETWORKS[0];
  const activeTint = getNetworkTint(safeNetwork);
  const hasSwitchMatch = walletNetwork != null && walletNetwork !== safeNetwork;

  const handleSelect = (next: string) => {
    if (!isNetwork(next)) return;
    if (next === safeNetwork) return;
    if (walletNetwork && next !== walletNetwork && onMismatch) {
      onMismatch(next);
    } else {
      onChange?(next);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className={`h-8 px-2 rounded-full flex gap-1.5 items-center border bg-opacity-10 dark:bg-opacity-10 transition-colors ${className ?? ""}`}
          style={{ borderColor: hasSwitchMatch ? "#e0b308" : activeTint.border, backgroundColor: activeTint.bg, color: activeTint.text }}
          aria-label="Select network"
          title={hasSwitchMatch ? `Wallet is on ${walletNetwork}, not ${safeNetwork}` : undefined}
        >
          <StellarIcon className="h-[20px] w-[20px]" style={{ color: activeTint.tint }} />
          <span className="lg:text-sm text-xs mr-1">{safeNetwork}</span>
          <ArrowDown className="h-[12px] w-[12px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Network</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NETWORKS.map((n) => {
          const t = getNetworkTint(n);
          const isSelected = n === safeNetwork;
          const isMismatched = walletNetwork != null && n !== walletNetwork;
          return (
            <DropdownMenuItem
              key={n}
              onClick={() => handleSelect(n)}
              className="cursor-pointer flex items-center gap-2"
              role="menuitemradio"
              aria-checked={isSelected}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: t.tint }}
              />
              {n}
              {isMismatched && (
                <span
                  className="ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold"
                  title={`Wallet is on ${walletNetwork}, not ${n}`}
                >
                  !
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
