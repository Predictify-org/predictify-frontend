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

interface NetworkSwitcherProps {
  network: string;
  onChange?: (next: string) => void;
  className?: string;
}

const NETWORKS = ["Stellar"];

export function NetworkSwitcher({ network, onChange, className }: NetworkSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="h-8 px-2 rounded-full flex gap-1.5 items-center border border-[#540D8D] dark:border-[#FFFFFF] bg-[#540D8D1F] dark:text-white dark:bg-[#FFFFFF1C]"
          aria-label="Select network"
        >
          <StellarIcon className="h-[20px] w-[20px]" />
          <span className="text-[#540D8D] lg:text-sm text-xs dark:text-white mr-1">{network}</span>
          <ArrowDown className="h-[12px] w-[12px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Network</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NETWORKS.map((n) => (
          <DropdownMenuItem key={n} onClick={() => onChange?.(n)} className="cursor-pointer" role="menuitemradio" aria-checked={n === network}>
            <StellarIcon className="h-[20px] w-[20px]" />
            {n}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


