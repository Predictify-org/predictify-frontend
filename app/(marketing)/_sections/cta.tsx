"use client"

import ConnectWalletButton from "../_components/connectWalletButton2";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { useState } from "react";

export function CTA() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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
    <section
      id="cta"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
    >

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 h-full w-1/2 rotate-12 bg-gradient-to-b from-white/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 h-full w-1/2 -rotate-12 bg-gradient-to-t from-white/5 to-transparent blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-bold text-white sm:mb-8 sm:text-4xl md:text-5xl lg:text-6xl">
            Ready to Turn Your Insights Into Rewards?
          </h2>
          <p className="mb-8 text-base leading-relaxed text-white/90 sm:mb-12 sm:text-lg lg:text-xl">
            Join thousands of predictors worldwide and start earning from your knowledge and intuition today.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-purple-600 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-100 sm:w-auto"
            >
              <span className="relative z-10 flex items-center">
                <ConnectWalletButton
                  isConnected={isConnected}
                  walletName={walletName}
                  walletAddress={walletAddress}
                  onConnectClick={() => setIsWalletModalOpen(true)}
                  onOpenModal={() => setIsWalletModalOpen(true)}
                />
              </span>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </button>
            <button
              className="inline-flex w-full items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-8 py-3.5 font-medium text-white backdrop-blur-sm transition-all duration-200 hover:border-white/50 hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30 active:bg-white/15 sm:w-auto"
            >
              Learn More
            </button>
          </div>
        </div>
        <ConnectWalletModal
          isOpen={isWalletModalOpen}
          onOpenChange={setIsWalletModalOpen}
          onWalletConnect={handleWalletConnect}
          onWalletDisconnect={handleWalletDisconnect}
        />
      </div>
    </section>
  );
}