"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { AlertCircle, Check, Copy, LogOut, Info, ExternalLink } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getKit } from "@/constants/wallet-kits.constant";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  url: string;
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (name: string, address: string) => void;
  onWalletDisconnect?: () => void;
}

const defaultWallets: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    icon: "/assets/wallets/freighter.svg",
    url: "https://freighter.app/",
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    icon: "/assets/wallets/lobstr.svg",
    url: "https://lobstr.co/",
  },
  {
    id: "xbull",
    name: "XBULL",
    icon: "/assets/wallets/xbull.svg",
    url: "https://xbull.app/",
  },
  {
    id: "albedo",
    name: "Albedo",
    icon: "/assets/wallets/albedo.svg",
    url: "https://albedo.link/",
  },
  {
    id: "rabet",
    name: "Rabet",
    icon: "/assets/wallets/rabet.svg",
    url: "https://rabet.io/",
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
  const [walletsAvailability, setWalletsAvailability] = useState<Record<string, boolean>>({});
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);

  // Clean up connection error and connecting wallet id when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setConnectionError(null);
      setConnectingWalletId(null);
    } else {
      // Check wallet availability when modal opens
      try {
        const kit = getKit();
        kit.getSupportedWallets()
          .then(supported => {
            const availability: Record<string, boolean> = {};
            supported.forEach(w => {
              availability[w.id] = w.isAvailable;
            });
            setWalletsAvailability(availability);
            setHasCheckedAvailability(true);
          })
          .catch(err => {
            console.error("Failed to load wallets availability", err);
            setHasCheckedAvailability(true); // Stop loading state even on error
          });
      } catch (err) {
        console.error("Error accessing wallet kit", err);
        setHasCheckedAvailability(true);
      }
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
          <DialogTitle className="font-bold flex items-center justify-between">
            <span>{isConnected ? `Wallet Connected` : `Connect Your Wallet`}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" aria-label="Why these wallets?">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Why these wallets?</h4>
                  <p className="text-sm text-muted-foreground">
                    We support secure and audited wallets that are widely used in the Stellar ecosystem. 
                    These wallets provide the best user experience and security for managing your digital assets and making predictions on our platform.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
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
          {defaultWallets.map((wallet) => {
            // Assume available if we haven't loaded the status yet
            const isAvailable = hasCheckedAvailability 
              ? walletsAvailability[wallet.id] !== false 
              : true;
            
            const isDisabled = !!connectingWalletId || isConnected || !isAvailable;

            return (
              <div key={wallet.id} className="relative group">
                <Button
                  variant="outline"
                  onClick={() => handleWalletConnect(wallet)}
                  disabled={isDisabled}
                  className={`flex items-center justify-start cursor-pointer gap-3 w-full p-4 h-auto transition-colors ${
                    isConnected && walletName === wallet.name
                      ? "border-primary"
                      : ""
                  } ${
                    isAvailable 
                      ? "hover:bg-accent hover:text-accent-foreground" 
                      : "opacity-60 grayscale hover:bg-transparent"
                  }`}
                >
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={wallet.icon || "/images/placeholder.png"}
                      alt={`${wallet.name} logo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-bold text-base">{wallet.name}</span>
                    {!isAvailable && hasCheckedAvailability && (
                      <span className="text-xs text-muted-foreground font-normal">Not installed</span>
                    )}
                  </div>
                  
                  {connectingWalletId === wallet.id && (
                    <span className="ml-auto text-sm font-normal">Connecting...</span>
                  )}
                  {isConnected && walletName === wallet.name && (
                    <span className="ml-auto text-primary text-sm font-normal">Connected</span>
                  )}
                </Button>
                
                {!isAvailable && hasCheckedAvailability && (
                  <a
                    href={wallet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 text-xs text-primary hover:underline bg-background/90 px-3 py-1.5 rounded-md shadow-sm border"
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={0}
                  >
                    Install <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            );
          })}
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
