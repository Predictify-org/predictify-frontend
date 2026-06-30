"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ReactNode } from "react";
import { useHideBalancesShortcut } from "@/hooks/useHideBalancesShortcut";

interface ProvidersProps {
  children: ReactNode;
}

import { ClaimShareProvider } from "@/context/ClaimShareContext";

/**
 * Client-side providers wrapper
 * Includes ErrorBoundary, ThemeProvider, WalletProvider, AccessibilityProvider, and Toaster
 */
export function Providers({ children }: ProvidersProps) {
  // Initialize global shortcut for hide balances toggle
  useHideBalancesShortcut();
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AccessibilityProvider>
          <PrivacyProvider>
            <WalletProvider>
              <ClaimShareProvider>
                {children}
              </ClaimShareProvider>
            </WalletProvider>
          </PrivacyProvider>
        </AccessibilityProvider>
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}




