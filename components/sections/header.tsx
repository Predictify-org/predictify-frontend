"use client"
import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "../ui/logo";
import { GradientButton } from "../ui/gradient-button";
import { useState } from "react";
import ConnectWalletButton from "../ui/connectWalletButton";
import { ConnectWalletModal } from "../connect-wallet-modal";
import { NAVIGATION_LINKS } from "../constants/data";

export function Header() {
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
    <header className="relative z-50 border-b border-cyan-500/20 backdrop-blur-xl bg-slate-950/80 sticky top-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAVIGATION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 font-medium"
              >
                {link.label}
              </Link>
            ))}
                      <GradientButton>
                           <ConnectWalletButton
                                      isConnected={isConnected}
                                      walletName={walletName}
                                      walletAddress={walletAddress}
                                      onConnectClick={() => setIsWalletModalOpen(true)}
                                      onOpenModal={() => setIsWalletModalOpen(true)}
                                    />
            </GradientButton>
          </nav>

          {/* Mobile Menu Button */}
          <button className="lg:hidden text-slate-300 hover:text-cyan-400 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
              <ConnectWalletModal
                isOpen={isWalletModalOpen}
                onOpenChange={setIsWalletModalOpen}
                onWalletConnect={handleWalletConnect}
                onWalletDisconnect={handleWalletDisconnect}
              />
    </header>
  );
}
