"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ReactNode } from "react";
import { useHideBalancesShortcut } from "@/hooks/useHideBalancesShortcut";
import { ClaimShareProvider } from "@/context/ClaimShareContext";
import { GlobalLiveRegion } from "@/app/components/GlobalLiveRegion";
import { RouteDocumentTitle } from "@/app/hooks/useDocumentTitle";
import { RouteProgressBar } from "@/app/components/RouteProgressBar";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Includes ErrorBoundary, ThemeProvider, WalletProvider, and Toaster
 */
export function Providers({ children }: ProvidersProps) {
  // Initialize global shortcut for hide balances toggle
  useHideBalancesShortcut();
  return (
    <ErrorBoundary>
      <RouteDocumentTitle />
      <RouteProgressBar />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <PrivacyProvider>
          <WalletProvider>
            <ClaimShareProvider>
              {children}
            </ClaimShareProvider>
          </WalletProvider>
        </PrivacyProvider>
        <GlobalLiveRegion />
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}




