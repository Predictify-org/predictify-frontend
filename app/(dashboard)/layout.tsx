"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar/Navbar";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";

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
        <div className="">{children}</div>
      </main>
    </div>
  );
}

