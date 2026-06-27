"use client";

import React from 'react';
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
import { Switch } from "@/components/ui/switch";
import { usePrivacy } from "@/context/PrivacyContext";
import { maskAmount } from "@/utils/maskAmount";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNetworkTint } from "@/lib/network-tint";
import { mockUser as user } from "./navbar.mock";

function truncateMiddle(address: string, visible = 4) {
  if (address.length <= visible * 2) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

export function WalletMenu({ network }: { network: string }) {
  const { address, connected, isLoading } = useWalletContext();
  const { disconnectWallet } = useWallet();
  const [isOpen, setIsOpen] = React.useState(false);
  const { hideBalances, setHideBalances } = usePrivacy();

  const activeTint = getNetworkTint(network);
  const display = connected && address ? (hideBalances ? maskAmount(address) : truncateMiddle(address)) : "Connect wallet";

  if (isLoading) {
    return (
      <Button
        variant="secondary"
        className="h-8 rounded-full flex items-center border bg-opacity-10 opacity-50 transition-colors"
        style={{ borderColor: activeTint.border, backgroundColor: activeTint.bg, color: activeTint.text }}
        disabled
        aria-label="Loading wallet state"
      >
        <span className="text-sm">Loading...</span>
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
          className="h-8 rounded-full flex items-center border bg-opacity-10 transition-colors"
          style={{ borderColor: activeTint.border, backgroundColor: activeTint.bg, color: activeTint.text }}
          onClick={() => setIsOpen(true)}
          aria-label="Connect wallet"
        >
          <span className="text-sm">{display}</span>
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
            className="h-9 px-1.5 rounded-full flex items-center gap-2 border transition-all"
            style={{ 
              borderColor: activeTint.border, 
              backgroundColor: activeTint.bg,
              color: activeTint.text 
            }}
            aria-haspopup="menu"
            aria-label="Wallet menu"
          >
            <Avatar className="h-6 w-6 border-2" style={{ borderColor: activeTint.tint }}>
              <AvatarImage src={user?.avatarUrl} alt={user?.name} />
              <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{display}</span>
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
