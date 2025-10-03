"use client"
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/stat-card";
import { Wallet, ArrowRight } from "lucide-react";
import { HERO_STATS } from "../constants/data";
import { GradientButton } from "../ui/gradient-button";
import { useState } from "react";
import ConnectWalletButton from "../ui/connectWalletButton";
import { ConnectWalletModal } from "../connect-wallet-modal";

export function Hero() {
      const [isMounted, setIsMounted] = useState(false);
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
    <section className="relative py-16 sm:py-20 md:py-32 lg:py-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-6 sm:mb-8 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105">
            🚀 Now Live on Mainnet
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 sm:mb-8 leading-tight">
            Predict the Future,
            <br className="hidden sm:block" />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                Earn Rewards
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent blur-sm opacity-50 -z-10">
                Earn Rewards
              </div>
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed">
            The world's first decentralized prediction platform. Make
            predictions on real-world events, sports, crypto prices, and more.
            Powered by blockchain technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-16 sm:mb-20">
            <GradientButton 
              size="lg" 
              fullWidth
              onClick={() => setIsWalletModalOpen(true)}
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
              <ConnectWalletButton
                isConnected={isConnected}
                walletName={walletName}
                walletAddress={walletAddress}
                onConnectClick={() => setIsWalletModalOpen(true)}
                onOpenModal={() => setIsWalletModalOpen(true)}
                asButton={false}
              />
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-3" />
            </GradientButton>

            <GradientButton variant="secondary" size="lg" fullWidth>
              View Live Markets
            </GradientButton>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto">
            {HERO_STATS.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
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
