"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/useWallet.hook";
import {
  reconnectBannerTitle,
  reconnectBannerDescription,
  reconnectButtonLabel,
  dismissButtonLabel,
  reconnectAriaLabel,
  dismissAriaLabel,
} from "@/components/wallet-reconnect-banner.messages";

const HAS_CONNECTED_KEY = "predictify_has_connected";

export interface WalletReconnectBannerProps {
  className?: string;
  onReconnect?: () => void;
  supportedChainIds?: (number | string)[];
}

export function WalletReconnectBanner({
  className,
  onReconnect,
  supportedChainIds,
}: WalletReconnectBannerProps) {
  const { isConnected, chainId } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);
  const wasConnectedRef = useRef(isConnected);
  const initialCheckDone = useRef(false);
  const previousChainIdRef = useRef(chainId);
  const wapMismatchRef = useRef(false);

  const isNetworkMismatch = Boolean(
    isConnected &&
      supportedChainIds &&
      !(chainId !== undefined && supportedChainIds.some((id) => String(id) === String(chainId)))
  );

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    const wasMismatch = wapMismatchRef.current;

    if (!initialCheckDone.current) {
      initialCheckDone.current = true;

      let hasConnectedBefore = false;
      try {
        hasConnectedBefore = localStorage.getItem(HAS_CONNECTED_KEY) === "true";
      } catch {
        /* localStorage unavailable */
      }

      if (isConnected) {
        try {
          localStorage.setItem(HAS_CONNECTED_KEY, "true");
        } catch {
          /* localStorage unavailable */
        }

        if (isNetworkMismatch) {
          setShow(true);
          setDismissed(false);
        }
      } else if (hasConnectedBefore) {
        setShow(true);
      }

      wasConnectedRef.current = isConnected;
      wapMismatchRef.current = isNetworkMismatch;
      previousChainIdRef.current = chainId;
      return;
    }

    // Transition: disconnected -> connected
    if (!wasConnected && isConnected) {
      try {
        localStorage.setItem(HAS_CONNECTED_KEY, "true");
      } catch {
        /* localStorage unavailable */
      }
      setShow(false);
      setDismissed(false);
    }

    // Transition: connected -> disconnected
    if (wasConnected && !isConnected) {
      try {
        localStorage.removeItem(HAS_CONNECTED_KEY);
      } catch {
        /* localStorage unavailable */
      }
      setShow(true);
      setDismissed(false);
    }

    // Network changed while connected
    if (isConnected && chainId !== previousChainIdRef.current) {
      setDismissed(false);
      if (isNetworkMismatch) {
        setShow(true);
      } else {
        setShow(false);
      }
    }

    // Network mismatch appeared (e.g., supportedChainIds prop changed)
    if (isConnected && isNetworkMismatch && !wasMismatch) {
      setShow(true);
      setDismissed(false);
    }

    // Network mismatch resolved
    if (isConnected && !isNetworkMismatch && wasMismatch) {
      setShow(false);
      setDismissed(false);
    }

    wasConnectedRef.current = isConnected;
    wapMismatchRef.current = isNetworkMismatch;
    previousChainIdRef.current = chainId;
  }, [isConnected, chainId, isNetworkMismatch]);

  const handleReconnect = useCallback(() => {
    onReconnect?.();
  }, [onReconnect]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setShow(false);
  }, []);

  const actionLabel = isNetworkMismatch ? "Switch network" : reconnectButtonLabel;
  const actionAriaLabel = isNetworkMismatch ? "Switch network" : reconnectAriaLabel;

  if (!show || dismissed) return null;

  return (
    <div className={cn("w-full", className)}>
      <Alert
        role="alert"
        aria-live="polite"
        className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-400 [svg]:text-amber-500"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{isNetworkMismatch ? "Unsupported network" : reconnectBannerTitle}</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {isNetworkMismatch
                ? "Please switch to a supported network to continue."
                : reconnectBannerDescription}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                aria-label={dismissAriaLabel}
              >
                <X className="h-4/ w4 mr-1" aria-hidden="true" />
                {dismissButtonLabel}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleReconnect}
                aria-label={actionAriaLabel}
              >
                <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
                {actionLabel}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
