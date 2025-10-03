"use client"
import { Wallet } from "lucide-react";
import { usePathname } from "next/navigation";

interface ButtonProps {
  isConnected: boolean;
  walletName: string | null;
  walletAddress: string | null;
  onConnectClick: () => void;
  onOpenModal: () => void;
  asButton?: boolean; // New prop to control if it renders as button or content
}

function ConnectWalletButton({
  isConnected,
  walletName,
  walletAddress,
  onConnectClick,
  onOpenModal,
  asButton = true,
}: ButtonProps) {
  const pathname = usePathname(); 
  
  const content = !isConnected ? (
    <>
      {pathname !== "/" && <Wallet size={18} />}
      Connect Wallet
    </>
  ) : (
    <>
      {pathname !== "/" && <Wallet size={18} />}
      {walletName || "Wallet"}:{" "}
      {walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "Address not available"}
    </>
  );

  if (!asButton) {
    return <span onClick={!isConnected ? onConnectClick : onOpenModal} className="cursor-pointer">{content}</span>;
  }

  return (
    <>
      {!isConnected ? (
        <button
          onClick={onConnectClick}
          className={`${
            pathname != "/"
              ? "relative px-5 py-2 cursor-pointer font-medium rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:border-cyan-400/40 hover:text-cyan-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 flex items-center gap-2"
              : "bg-none"
          }`}
        >
          {content}
        </button>
      ) : (
        <button
          onClick={onOpenModal}
          className="relative px-5 py-2 cursor-pointer font-medium rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 
          text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20 
          hover:shadow-cyan-500/30 hover:border-cyan-400/40 hover:text-cyan-300 
          transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40
          flex items-center gap-2"
        >
          {content}
        </button>
      )}
    </>
  );
}

export default ConnectWalletButton;
