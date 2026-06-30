"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ReactNode } from "react";
import { useHideBalancesShortcut } from "@/hooks/useHideBalancesShortcut";
import { ClaimShareProvider } from "@/context/ClaimShareContext";
import { RouteDocumentTitle } from "@/app/hooks/useDocumentTitle";

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
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <PrivacyProvider>
          <AccessibilityProvider>
            <WalletProvider>
              <ClaimShareProvider>
                {children}
              </ClaimShareProvider>
            </WalletProvider>
          </AccessibilityProvider>
        </PrivacyProvider>
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}




