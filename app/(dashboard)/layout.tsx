"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar/Navbar";
import { Breadcrumbs } from "@/components/navbar/Breadcrumbs";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { getBreadcrumbsForPath } from "@/lib/breadcrumbs";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const pathname = usePathname();
  const breadcrumbItems = getBreadcrumbsForPath(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleWalletConnect = (name: string, address: string) => {
    setIsConnected(true);
    setWalletName(name);
    setWalletAddress(address);
    setIsWalletModalOpen(false);
  };

  const handleWalletDisconnect = () => {
    setIsConnected(false);
    setWalletName(null);
    setWalletAddress(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060e20]">
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
      />

      {/* Global Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-12 pt-20">
        {breadcrumbItems.length > 0 && (
          <div className="px-6 pt-4">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        )}
        <div className="">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    <MobileBottomTabs />
    </div>
  );
}

