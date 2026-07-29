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
}

export function WalletReconnectBanner({
  className,
  onReconnect,
}: WalletReconnectBannerProps) {
  const { isConnected } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);
  const wasConnectedRef = useRef(isConnected);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;

      let hasConnectedBefore = false;
      try {
        hasConnectedBefore =
          localStorage.getItem(HAS_CONNECTED_KEY) === "true";
      } catch {
        /* localStorage unavailable */
      }

      if (hasConnectedBefore && !isConnected) {
        setShow(true);
      }

      if (isConnected) {
        try {
          localStorage.setItem(HAS_CONNECTED_KEY, "true");
        } catch {
          /* localStorage unavailable */
        }
      }

      wasConnectedRef.current = isConnected;
      return;
    }

    if (wasConnectedRef.current && !isConnected) {
      try {
        localStorage.removeItem(HAS_CONNECTED_KEY);
      } catch {
        /* localStorage unavailable */
      }
      setShow(false);
      setDismissed(false);
    }

    if (!wasConnectedRef.current && isConnected) {
      try {
        localStorage.setItem(HAS_CONNECTED_KEY, "true");
      } catch {
        /* localStorage unavailable */
      }
      setShow(false);
      setDismissed(false);
    }

    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  const handleReconnect = useCallback(() => {
    onReconnect?.();
  }, [onReconnect]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setShow(false);
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className={cn("w-full", className)}>
      <Alert
        role="alert"
        aria-live="polite"
        className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-400 [&>svg]:text-amber-500"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{reconnectBannerTitle}</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{reconnectBannerDescription}</p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                aria-label={dismissAriaLabel}
              >
                <X className="h-4 w-4 mr-1" aria-hidden="true" />
                {dismissButtonLabel}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleReconnect}
                aria-label={reconnectAriaLabel}
              >
                <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
                {reconnectButtonLabel}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
