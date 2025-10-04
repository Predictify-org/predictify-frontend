"use client"
import { Menu, Wallet } from "lucide-react";
import Link from "next/link";
import { Logo } from "../ui/logo";
import { useState } from "react";
import { ConnectWalletModal } from "../connect-wallet-modal";
import { NAVIGATION_LINKS } from "../constants/data";
import { useWalletContext } from "@/context/WalletContext";

export function Header() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { connected: isConnected, name: walletName, address: walletAddress } = useWalletContext();

  const handleWalletConnect = (name: string, address: string) => {
    setIsWalletModalOpen(false);
  };

  const handleWalletDisconnect = () => {
    // Wallet context handles the disconnect logic
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
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="relative font-bold transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-1 text-base px-6 py-3 rounded-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-md blur opacity-50 -z-10"></div>
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                {!isConnected ? (
                  "Connect Wallet"
                ) : (
                  <>
                    {walletName || "Wallet"}:{" "}
                    {walletAddress
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : "Address not available"}
                  </>
                )}
              </div>
            </button>
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
