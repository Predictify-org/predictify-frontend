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
}

const NETWORKS = ["Mainnet", "Testnet", "Futurenet"];

export function NetworkSwitcher({ network, onChange, className }: NetworkSwitcherProps) {
  const activeTint = getNetworkTint(network);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="h-8 px-2 rounded-full flex gap-1.5 items-center border bg-opacity-10 dark:bg-opacity-10 transition-colors"
          style={{ 
            borderColor: activeTint.border,
            backgroundColor: activeTint.bg,
            color: activeTint.text 
          }}
          aria-label="Select network"
        >
          <StellarIcon className="h-[20px] w-[20px]" style={{ color: activeTint.tint }} />
          <span className="lg:text-sm text-xs mr-1">{network}</span>
          <ArrowDown className="h-[12px] w-[12px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Network</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NETWORKS.map((n) => {
          const t = getNetworkTint(n);
          return (
            <DropdownMenuItem 
              key={n} 
              onClick={() => onChange?.(n)} 
              className="cursor-pointer flex items-center gap-2" 
              role="menuitemradio" 
              aria-checked={n === network}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: t.tint }} 
              />
              {n}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


