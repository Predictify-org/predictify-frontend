"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/context/WalletContext";
import { ArrowDown } from "../icons";

interface ConnectWalletActionProps {
  onOpenModal: () => void;
  compact?: boolean;
}

export function ConnectWalletAction({ onOpenModal, compact = false }: ConnectWalletActionProps) {
  const { address, connected } = useWalletContext();

  function truncateMiddle(value: string, visible = 4) {
    if (!value) return "";
    return value.length <= visible * 2 ? value : `${value.slice(0, visible)}…${value.slice(-visible)}`;
  }

  const baseClasses = compact
    ? "lg:h-11 h-8 w-fit px-2 justify-between rounded-full border border-[#540D8D] dark:border-[#FFFFFF] bg-[#540D8D1F] dark:bg-[#FFFFFF1C] dark:text-white"
    : "h-11 justify-between rounded-full border border-[#540D8D] dark:border-[#FFFFFF] bg-[#540D8D1F] dark:bg-[#FFFFFF1C] dark:text-white px-4";

  return (
    <Button
      onClick={onOpenModal}
      variant="secondary"
      className={baseClasses}
      aria-label="Wallet"
    >
      <span className="text-[#540D8D] lg:text-sm text-xs dark:text-white">
        {connected && address ? truncateMiddle(address) : "Connect wallet"}
      </span>
      {connected && address && <ArrowDown className="lg:h-[22px] h-[12px] lg:w-[22px] w-[12px]" />}
    </Button>
  );
}


