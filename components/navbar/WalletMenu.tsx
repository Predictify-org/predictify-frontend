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
import { useWalletContext } from "@/context/WalletContext";
import { useWallet } from "@/hooks/useWallet.hook";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { Copy as CopyIcon, RefreshCcw, LogOut as LogOutIcon } from "lucide-react";
import ArrowDownIcon from "../icons/ArrowDown";

function truncateMiddle(address: string, visible = 4) {
  if (address.length <= visible * 2) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

export function WalletMenu() {
  const { address, connected, isLoading } = useWalletContext();
  const { disconnectWallet } = useWallet();
  const [isOpen, setIsOpen] = React.useState(false);

  const display = connected && address ? truncateMiddle(address) : "Connect wallet";

  // Show loading state while wallet context is initializing
  if (isLoading) {
    return (
      <Button
        variant="secondary"
        className="h-8 rounded-full flex items-center border border-[#540D8D] dark:border-white dark:border-[0.24px] bg-[#540D8D1F] dark:bg-[#FFFFFF1C] dark:text-white opacity-50"
        disabled
        aria-label="Loading wallet state"
      >
        <span className="text-[#540D8D] text-sm dark:text-white">Loading...</span>
      </Button>
    );
  }

  function handleCopy() {
    if (address) navigator.clipboard.writeText(address);
  }

  if (!connected) {
    return (
      <>
        <Button
          variant="secondary"
          className="h-8 rounded-full flex items-center border border-[#540D8D] dark:border-white dark:border-[0.24px] bg-[#540D8D1F] dark:bg-[#FFFFFF1C] dark:text-white"
          onClick={() => setIsOpen(true)}
          aria-label="Connect wallet"
        >
          <span className="text-[#540D8D] text-sm dark:text-white">{display}</span>
        </Button>
        <ConnectWalletModal isOpen={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-8 rounded-full flex items-center border border-[#540D8D] dark:border-white dark:border-[0.24px] bg-[#540D8D1F] dark:bg-[#FFFFFF1C] dark:text-white"
            aria-haspopup="menu"
            aria-label="Wallet menu"
          >
            <span className="text-[#540D8D] text-sm dark:text-white">{display}</span>
            <ArrowDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" role="menu">
          <DropdownMenuLabel>Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem role="menuitem" onClick={handleCopy} className="cursor-pointer" aria-label="Copy address">
            <CopyIcon className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem role="menuitem" onClick={() => setIsOpen(true)} className="cursor-pointer" aria-label="Switch wallet">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Switch
          </DropdownMenuItem>
          <DropdownMenuItem
            role="menuitem"
            onClick={() => {
              void disconnectWallet();
            }}
            className="cursor-pointer"
            aria-label="Disconnect wallet"
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConnectWalletModal isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}


