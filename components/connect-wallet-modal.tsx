"use client";

import { useWallet } from "@/hooks/useWallet.hook";
import { recordLastUsedWallet, getLastUsedWalletId } from "@/app/state/walletPrefs";
import { AlertCircle, Check, Clock, Copy, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  walletConnectedTitle,
  walletConnectedDescription,
  connectWalletTitle,
  connectWalletDescription,
  connectingLabel,
  connectedLabel,
  disconnectButtonLabel,
  lastUsedBadgeLabel,
  lastUsedBadgeText,
  copyAddressLabel,
  addressCopiedLabel,
  connectionErrorUnexpected,
  disconnectionErrorUnexpected,
  friendlyConnectionError,
} from "@/components/connect-wallet-modal.messages";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  url: string;
}

export interface ConnectWalletModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect?: (name: string, address: string) => void;
  onWalletDisconnect?: () => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const walletOptions: WalletOption[] = [
  { id: "freighter", name: "Freighter", icon: "/images/freighter.png" },
  { id: "lobstr",    name: "LOBSTR",    icon: "/images/lobstr.png"    },
  { id: "xbull",     name: "XBULL",     icon: "/images/xbull.svg"     },
  { id: "albedo",    name: "Albedo",    icon: "/images/albedo.png"    },
  { id: "rabet",     name: "Rabet",     icon: "/images/rabet.webp"    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Small "Last used" badge rendered next to the most recently used wallet.
 * Uses design-token colours so it respects light/dark mode automatically.
 */
function LastUsedBadge() {
  return (
    <Badge
      variant="secondary"
      className="ml-auto flex items-center gap-1 text-xs font-medium"
      aria-label={lastUsedBadgeLabel}
      data-testid="last-used-badge"
    >
      {/* Clock icon communicates "recent" without relying on colour alone (WCAG 1.4.1) */}
      <Clock className="h-3 w-3" aria-hidden="true" />
      {lastUsedBadgeText}
    </Badge>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

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

  const [connectionError, setConnectionError]     = useState<string | null>(null);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [copied, setCopied]                       = useState(false);
  const [walletsAvailability, setWalletsAvailability] = useState<Record<string, boolean>>({});
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);

  /**
   * Read the last-used ID from localStorage on mount (client-only).
   * Initialised to `null` to avoid hydration mismatches on SSR.
   */
  const [lastUsedId, setLastUsedId] = useState<string | null>(null);

  useEffect(() => {
    // Only runs on the client, so safe to read localStorage here.
    setLastUsedId(getLastUsedWalletId());
  }, []);

  // Clean up transient UI state whenever the modal is closed.
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

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleWalletConnect = async (wallet: WalletOption) => {
    if (connectingWalletId) return;

    setConnectingWalletId(wallet.id);
    try {
      const result = await connectWallet(wallet.id);
      if (result.success) {
        // Persist the last-used wallet so the badge appears next time.
        recordLastUsedWallet(wallet.id);
        setLastUsedId(wallet.id);

        if (onWalletConnect && result.address) {
          onWalletConnect(wallet.name, result.address);
        }
        onOpenChange(false);
      } else {
        setConnectionError(friendlyConnectionError(result.error));
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setConnectionError(connectionErrorUnexpected);
    } finally {
      setConnectingWalletId(null);
    }
  };

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    if (!result.success) {
      setConnectionError(result.error ? friendlyConnectionError(result.error) : disconnectionErrorUnexpected);
    } else {
      onWalletDisconnect?.();
      onOpenChange(false);
    }
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-bold">
            {isConnected ? walletConnectedTitle : connectWalletTitle}
          </DialogTitle>
          <DialogDescription>
            {isConnected ? walletConnectedDescription : connectWalletDescription}
          </DialogDescription>
        </DialogHeader>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {connectionError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2 mb-4 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">{connectionError}</p>
          </div>
        )}

        {/* ── Connected address card ─────────────────────────────────────── */}
        {isConnected && (
          <div className="bg-muted p-3 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{walletName}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">
                    {truncateAddress(walletAddress ?? "")}
                  </p>
                  <button
                    type="button"
                    onClick={copyAddress}
                    aria-label={copied ? addressCopiedLabel : copyAddressLabel}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6 p-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Wallet list ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 py-4">
          {walletOptions.map((wallet) => {
            const isLastUsed   = lastUsedId === wallet.id;
            const isCurrentlyConnected = isConnected && walletName === wallet.name;

            return (
              <Button
                key={wallet.id}
                variant="outline"
                onClick={() => handleWalletConnect(wallet)}
                disabled={!!connectingWalletId || isConnected}
                aria-label={
                  isLastUsed
                    ? `Connect ${wallet.name} (last used)`
                    : `Connect ${wallet.name}`
                }
                className={`flex items-center justify-start cursor-pointer gap-3 w-full p-4 h-auto hover:bg-muted transition-colors ${
                  isCurrentlyConnected ? "border-primary" : ""
                }`}
              >
                {/* Provider logo */}
                <div className="w-10 h-10 relative rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={wallet.icon || "/images/placeholder.png"}
                    alt={`${wallet.name} logo`}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Provider name */}
                <span className="font-bold">{wallet.name}</span>

                {/* Right-side indicators — only one is shown at a time */}
                {connectingWalletId === wallet.id && (
                  <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
                    {connectingLabel}
                  </span>
                )}

                {isCurrentlyConnected && connectingWalletId !== wallet.id && (
                  <span className="ml-auto text-primary text-sm">{connectedLabel}</span>
                )}

                {/*
                 * "Last used" badge:
                 *   - Only shown when the modal is in "choose a wallet" mode
                 *     (not already connected) to avoid visual clutter.
                 *   - Hidden while a connection attempt is in progress.
                 */}
                {isLastUsed && !isConnected && connectingWalletId !== wallet.id && (
                  <LastUsedBadge />
                )}
              </Button>
            );
          })}
        </div>

        {/* ── Disconnect footer ──────────────────────────────────────────── */}
        {isConnected && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="text-destructive cursor-pointer hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              {disconnectButtonLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
