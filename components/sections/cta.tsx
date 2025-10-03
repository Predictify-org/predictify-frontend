"use client"
import { Wallet, ArrowRight } from "lucide-react";
import { GradientButton } from "../ui/gradient-button";
import ConnectWalletButton from "../ui/connectWalletButton";
import { ConnectWalletModal } from "../connect-wallet-modal";
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
    <section className="relative py-16 sm:py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8">
            Ready to Start
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {" "}
              Predicting
            </span>
            ?
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 leading-relaxed">
            Join thousands of users already earning rewards on Predictify.
            Connect your wallet and make your first prediction today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
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
              Learn More
            </GradientButton>
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
