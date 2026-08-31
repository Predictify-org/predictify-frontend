"use client";

import { useEffect, useState } from "react";
import { WalletModal, WalletModalProps } from "@/src/legacy-pages/WalletModal";

const SUPPORTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);

function getCurrentChainId(): number | undefined {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return Number((window as any).ethereum.chainId);
  }
  return undefined;
}

async function switchToSupportedChain(): Promise<void> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Ethereum provider not available");
  }
  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: { chainId: `0x${SUPPORTED_CHAIN_ID.toString(16)}`},
    });
  } catch (error) {
    console.error("Failed to switch network:", error);
    throw error;
  }
}

export function ConnectWalletModal(props: WalletModalProps) {
  const [chainId, setChainId] = useState<number | undefined>(getCurrentChainId);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() : () => void | void {
    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const handleChainChanged = (hexChainId: string) => {
      setChainId(Number(hexChainId));
    };

    (window as any).ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  useEffect(() => {
    setNetworkError(chainId !== undefined && chainId !== SUPPORTED_CHAIN_ID);
  }, [chainId]);

  if (networkError) {
    return (
      <div role="alert" className="network-mismatch-error">
        <h2>Wrong network detected</h2>
        <p>
          Your wallet is connected to network ID {chainId}. This application requires network ID {SUPPORTED_CHAIN_ID}.
        </p>
        <button onClick={async () => {
            try {
              await switchToSupportedChain();
            } catch (e) {
              // Stay on error state; the user can retry.
            }
          }}>
          Switch to supported network
        </button>
      </div>
    );
  }

  return <WalletModal {...props} />;
}

export type { WalletModalProps as ConnectWalletModalProps };
