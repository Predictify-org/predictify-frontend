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
import { RefreshCcw, LogOut as LogOutIcon } from "lucide-react";
import ArrowDownIcon from "../icons/ArrowDown";
import { Switch } from "@/components/ui/switch";
import { usePrivacy } from "@/context/PrivacyContext";
import { maskAmount } from "@/utils/maskAmount";
import { CopyableText } from "@/components/ui/CopyableText";

function truncateMiddle(address: string, visible = 4) {
  if (address.length <= visible * 2) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

export function WalletMenu() {
  const { address, connected, isLoading } = useWalletContext();
  const { disconnectWallet } = useWallet();
  const [isOpen, setIsOpen] = React.useState(false);
  const { hideBalances, setHideBalances } = usePrivacy();

  const display = connected && address ? (hideBalances ? maskAmount(address) : truncateMiddle(address)) : "Connect wallet";

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
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="text-xs font-normal text-muted-foreground">Connected Address</span>
            {address && <CopyableText text={address} className="-ml-1.5" visibleChars={6} />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem role="menuitem" onClick={() => setIsOpen(true)} className="cursor-pointer" aria-label="Switch wallet">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Switch
          </DropdownMenuItem>
          <DropdownMenuItem role="menuitem" onClick={() => { void disconnectWallet(); }} className="cursor-pointer" aria-label="Disconnect wallet">
            <LogOutIcon className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <label className="flex items-center justify-between w-full px-2 py-1">
              <span className="text-sm">Hide balances</span>
              <Switch checked={hideBalances} onCheckedChange={setHideBalances} />
            </label>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConnectWalletModal isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
