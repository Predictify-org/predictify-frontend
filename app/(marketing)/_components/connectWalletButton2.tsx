"use client"
import { Wallet } from "lucide-react";
import { usePathname } from "next/navigation";

interface ButtonProps {
  isConnected: boolean;
  walletName: string | null;
  walletAddress: string | null;
  onConnectClick: () => void;
  onOpenModal: () => void;
}

function ConnectWalletButton({
  isConnected,
  walletName,
  walletAddress,
  onConnectClick,
  onOpenModal,
}: ButtonProps) {
  const pathname = usePathname(); 
  return (
    <>
      {!isConnected ? (
        <button
          onClick={onConnectClick}
          className={`${
            pathname != "/"
              ? "relative px-5 py-2 cursor-pointer font-medium rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:border-cyan-400/40 hover:text-cyan-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 flex items-center gap-2"
              : "group relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-purple-600 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-100 sm:w-auto"
          }`}
        >
          {pathname !== "/" && <Wallet size={18} />}
          <span className="relative z-10 flex items-center">
            Connect Wallet & start
          </span>
          {pathname === "/" && (
            <div className="absolute inset-0 -z-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </button>
      ) : (
        <button
          onClick={onOpenModal}
          className={`${
            pathname != "/"
              ? "relative px-5 py-2 cursor-pointer font-medium rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:border-cyan-400/40 hover:text-cyan-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 flex items-center gap-2"
              : "group relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-purple-600 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-100 sm:w-auto"
          }`}
        >
          {pathname !== "/" && <Wallet size={18} />}
          <span className="relative z-10 flex items-center">
            {walletName || "Wallet"}:{" "}
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Address not available"}
          </span>
          {pathname === "/" && (
            <div className="absolute inset-0 -z-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </button>
      )}
    </>
  );
}

export default ConnectWalletButton;