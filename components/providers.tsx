"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ReactNode } from "react";
import { useHideBalancesShortcut } from "@/hooks/useHideBalancesShortcut";

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
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <PrivacyProvider>
          <WalletProvider>{children}</WalletProvider>
        </PrivacyProvider>
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}



