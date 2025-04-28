"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { AlertCircle, Check, Copy, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (name: string, address: string) => void;
  onWalletDisconnect?: () => void;
}

const walletOptions: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    icon: "/images/freighter.png",
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    icon: "/images/lobstr.png",
  },
  {
    id: "xbull",
    name: "XBULL",
    icon: "/images/xbull.svg",
  },
  {
    id: "albedo",
    name: "Albedo",
    icon: "/images/albedo.png",
  },
  {
    id: "rabet",
    name: "Rabet",
    icon: "/images/rabet.webp",
  },
];

export function ConnectWalletModal({
  isOpen,
  onOpenChange,
  onWalletConnect,
  onWalletDisconnect,
}: ConnectWalletModalProps) {
  const {
    connectWallet,
    disconnectWallet,
    isConnected,
    walletAddress,
    walletName,
  } = useWallet();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // Clean up connection error and connecting wallet id when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setConnectionError(null);
      setConnectingWalletId(null);
    }
  }, [isOpen]);

  const handleWalletConnect = async (wallet: WalletOption) => {
    if (connectingWalletId) return;

    setConnectingWalletId(wallet.id);
    try {
      const result = await connectWallet(wallet.id);
      if (result.success) {
        // Now call the onWalletConnect callback with the updated wallet info
        if (onWalletConnect) {
          if (result.address) {
            onWalletConnect(wallet.name, result.address);
          } else {
            console.error("Wallet address is undefined.");
          }
        }
        onOpenChange(false);
      } else {
        console.error("Error connecting wallet:", result.error);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setConnectingWalletId(null);
    }
  };

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    if (!result.success) {
      setConnectionError(
        result.error || "Unexpected error connecting the wallet"
      );
    } else {
      if (onWalletDisconnect) {
        onWalletDisconnect();
      }
      onOpenChange(false); // Close the modal after disconnecting
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-bold">
            {isConnected ? `Wallet Connected` : `Connect Your Wallet`}
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? `Your wallet is successfully connected.`
              : `Choose a wallet to enable secure transactions on SRust`}
          </DialogDescription>
        </DialogHeader>

        {connectionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{connectionError}</p>
          </div>
        )}

        {isConnected && (
          <div className="bg-muted p-3 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{walletName}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    {truncateAddress(walletAddress || "")}
                  </p>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6 p-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 py-4">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              onClick={() => handleWalletConnect(wallet)}
              disabled={!!connectingWalletId || isConnected}
              className={`flex items-center justify-start cursor-pointer gap-3 w-full p-4 h-auto hover:bg-muted transition-colors ${
                isConnected && walletName === wallet.name
                  ? "border-primary"
                  : ""
              }`}
            >
              <div className="w-10 h-10 relative rounded-lg overflow-hidden">
                <Image
                  src={wallet.icon || "/images/placeholder.png"}
                  alt={`${wallet.name} logo`}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold">{wallet.name}</span>
              {connectingWalletId === wallet.id && (
                <span className="ml-auto">Connecting...</span>
              )}
              {isConnected && walletName === wallet.name && (
                <span className="ml-auto text-primary text-sm">Connected</span>
              )}
            </Button>
          ))}
        </div>

        {isConnected && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="text-destructive cursor-pointer hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
