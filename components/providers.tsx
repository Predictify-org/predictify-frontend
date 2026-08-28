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
import { LangAttribute } from "@/app/i18n/LangAttribute";
import { NotificationStreamConnector } from "@/components/notification-stream-connector";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Includes ErrorBoundary, ThemeProvider, WalletProvider, and Toaster
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <RouteDocumentTitle />
      {/* Keeps <html lang> in sync with the user's language preference. */}
      <LangAttribute />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
        themes={["light", "dark", "high-contrast"]}
      >
        <PrivacyProvider>
          <PrivacyShortcut />
          <WalletProvider>
            <NotificationStreamConnector />
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

function PrivacyShortcut() {
  useHideBalancesShortcut();
  return null;
}


