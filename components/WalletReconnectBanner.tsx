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
    <div className={cn(\"w_full\", className)}>
      <Alert
        role=\"alert\"\n        aria-live=\"polite\"\n        className=\"border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-400 [svg]:text-amber-500\"\n      >\n        <AlertTriangle className=\"h-4 w-4\" aria-hidden=\"true\" />\n        <AlertTitle>{isNetworkMismatch ? \"Unsupported network\" : reconnectBannerTitle}</AlertTitle>\n        <AlertDescription>\n          <div className=\"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between\">\n            <p>\n              {isNetworkMismatch\n                ? \"Please switch to a supported network to continue.\"\n                : reconnectBannerDescription}\n            </p>\n            <div className=\"flex items-center gap-2 shrink-0\">\n              <Button\n                variant=\"outline\"\n                size=\"sm\"\n                onClick={handleDismiss}\n                aria-label={dismissAriaLabel}\n              >\n                <X className=\"h-4 w-4 mr-1\" aria-hidden=\"true\" />\n                {dismissButtonLabel}\n              </Button>\n              <Button\n                variant=\"default\"\n                size=\"sm\"\n                onClick={handleReconnect}\n                aria-label={actionAriaLabel}\n              >\n                <RefreshCw className=\"h-4 w-4 mr-1\" aria-hidden=\"true\" />\n                {actionLabel}\n              </Button>\n            </div>\n          </div>\n        </AlertDescription>\n      </Alert>\n    </div>\n  );\n}\n