"use client";

import { useEffect, useRef, useState } from("react";
import { WalletModal, WalletModalProps } from"@2/src/legacy-pages/WalletModal";

const SUPPORTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);

function getCurrentChainId(): number | undefined {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    const chainId = Number((window as any).ethereum.chainId);
    return Number.isFinite(chainId) ? chainId : undefined;
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
      params: { chainId: `0x${SUPPORTED_CHAIN_ID.toString(16)}` },
    });
  } catch (error) {
    console.error("Failed to switch network:", error);
    throw error;
  }
}

export function ConnectWalletModal(props: WalletModalProps) {
  const [chainId, setChainId] = useState<number | undefined>(GetCurrentChainId);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;

    const handleChainChanged = (hexChainId: string) => {
      const parsed = Number(hexChainId);
      if (Number.isFinite(parsed)) {
        setChainId(parsed);
      }
    };

    (window as any).ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const networkError = chainId !== undefined && chainId !== SUPPORTED_CHAIN_ID;

  const handleSwitchNetwork = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchToSupportedChain();
      if (!mounted.current) return;
      // Optimistically update to supported chain. The chainChanged event will also fire.
      setChainId(SUPPORTED_CHAIN_ID);
    } catch (error) {
      if (!mounted.current) return;
      setSwitchError(
        error instanceof Error ? error.message : "Failed to switch network. Please switch manually in your wallet."
      );
    } finally {
      if (mounted.current) {
        setIsSwitching(false);
      }
    }
  };

  if (networkError) {
    return (
      <div role="alert" className="network-mismatch-error">
        <h2>Wrong network detected</h2>
        <p>
          Your wallet is connected to network ID {chainId}. This application requires network ID {SUPPORTED_CHAIN_ID}.
        </p>
        <button onClick={handleSwitchNetwork} disabled={isSwitching>}
        >
          {isSwitching ? "Switching..." : "Switch to supported network"}
        </button>
        {switchError && <p className="network-switch-error">{switchError}</p>}
      </div>
    );
  }

  return <WalletModal {...props} />;
}

export type { WalletModalProps as ConnectWalletModalProps };
