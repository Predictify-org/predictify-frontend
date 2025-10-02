"use client"
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/stat-card";
// import { Wallet, ArrowRight } from "lucide-react";
import { HERO_STATS } from "../constants/data";
import { GradientButton } from "../ui/gradient-button";
import { useState } from "react";
import ConnectWalletButton from "../ui/connectWalletButton";
import { ConnectWalletModal } from "../connect-wallet-modal";
import { ArrowRight, TrendingUp, Globe, BarChart3, CheckCircle2, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#6B21A8] to-[#7C3AED] font-sans">
    {/* Gradient Orbs */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-[#C397EB33] blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[#4F46E533] blur-[120px]" />
    </div>

    {/* Content Container */}
    <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Column - Hero Content */}
        <div className="flex flex-col justify-center">
          {/* Badge */}
          <div className="mb-8 inline-flex w-fit items-center rounded-full bg-[#312E81] px-4 py-2 text-sm text-white backdrop-blur-sm">
            The Future of Prediction Markets
          </div>

          {/* Main Heading */}
          <div className="mb-6 space-y-2">
            <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">Predict.</h1>
            <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">Repeat.</h1>
            <div className="inline-block bg-gradient-to-r from-[#818CF8] to-[#A855F7] px-4 py-2">
              <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">Earn.</h1>
            </div>
          </div>

          {/* Description */}
          <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/90">
            Join the decentralized prediction platform where your insights turn into rewards. Powered by blockchain
            technology for transparent and instant payouts.
          </p>

          {/* CTA Buttons */}
          <div className="mb-12 flex items-center flex-wrap gap-4">
            <p className="bg-none text-white hover:bg-none">
              Start Predicting
            </p>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            >
              Learn More
            </Button>
          </div>

          {/* User Count */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="h-10 w-10 rounded-full border-2 border-purple-600 " />
              <div className="h-10 w-10 rounded-full border-2 border-purple-600 " />
              <div className="h-10 w-10 rounded-full border-2 border-purple-600 " />
            </div>
            <p className="text-sm text-white/50">Join 10,000+ predictors worldwide</p>
          </div>
        </div>

        {/* Right Column - Prediction Markets Preview */}
        <div className="relative flex items-center justify-center">
          {/* Win Notification Badge */}
          <div className="absolute right-0 -top-4 z-20 animate-fade-in rounded-2xl bg-gradient-to-r from-[#4F46E533] to-[#9333EA] p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-2">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">+250 USDC Won!</span>
            </div>
          </div>

          {/* Markets Card */}
          <Card className="w-full max-w-md border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Popular Prediction Markets</h2>
              <button className="text-sm text-purple-300 hover:text-purple-200">View All</button>
            </div>

            <div className="space-y-4">
              {/* Market 1 - Bitcoin Price */}
              <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Bitcoin Price</h3>
                      <p className="text-sm text-white/70">Will BTC exceed $75K by Q3 2023?</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">Yes 68%</div>
                    <div className="text-sm text-red-400">No: 32%</div>
                  </div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[68%] bg-gradient-to-r from-green-500 to-green-400" />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Pool: 1,245 USDC</span>
                  <span>Ends in 3 days</span>
                </div>
              </Card>

              {/* Market 2 - US Election */}
              <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                      <Globe className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">US Election 2024</h3>
                      <p className="text-sm text-white/70">Democratic party to win?</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">Yes: 53%</div>
                    <div className="text-sm text-red-400">No: 47%</div>
                  </div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[53%] bg-gradient-to-r from-green-500 to-green-400" />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Pool: 5,890 USDC</span>
                  <span>Ends in 8 months</span>
                </div>
              </Card>

              {/* Market 3 - Tesla Earnings */}
              <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-500/20 p-2">
                      <BarChart3 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Tesla Q2 Earnings</h3>
                      <p className="text-sm text-white/70">Will exceed analyst expectations?</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">Yes: 72%</div>
                    <div className="text-sm text-red-400">No: 28%</div>
                  </div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[72%] bg-gradient-to-r from-green-500 to-green-400" />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>Pool: 2,456 USDC</span>
                  <span>Ends in 14 days</span>
                </div>
              </Card>

              {/* Place Prediction Button */}
              <Button className="w-full bg-[#4F46E5] py-6 text-white hover:bg-[#4F46E5]/90">
                Place Your Prediction
              </Button>
            </div>
          </Card>

          {/* Success Notification Badge */}
          <div className="absolute bottom-4 left-0 z-20 animate-fade-in rounded-2xl bg-green-500 p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Prediction Correct!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
