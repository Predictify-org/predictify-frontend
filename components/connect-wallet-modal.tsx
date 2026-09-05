use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WalletModal, WalletModalProps } from "/src/legacy-pages/WalletModal";

const DEFAULT_CHAIN_ID = 1;
const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID);
const SUPPORTED_CHAIN_ID = Number.isInteger(envChainId) && envChainId > 0 ? envChainId : DEFAULT_CHAIN_ID;

function getEthereumProvider(): any | null {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return (window as any).ethereum;
  }
  return null;
}

function getCurrentChainId(): number | undefined {
  const provider = getEthereumProvider();
  if (!provider?.chainId) return undefined;
  const chainId = Number(provider.chainId);
  return Number.isFinite(chainId) ? chainId : undefined;
}

function isSupportedChainId(chainId: number | undefined): boolean {
  return chainId === SUPPORTED_CHAIN_ID;
}

async function switchToSupportedChain(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Ethereum provider not available");
  }
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${SUPPORTED_CHAIN_ID.toString(16)} }],
    });
  } catch (error) {
    console.error("Failed to switch network:", error);
    throw error;
  }
}

export function ConnectWalletModal(props: WalletModalProps) {
  const [chainId, setChainId] = useState<number | undefined>(getCurrentChainId);
  const [hasProvider, setHasProvider] = useState<boolean>(
    Default to false
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mounted = useRef(true);
  const chainIdRequestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const detectChainId = useCallback(async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      if (mounted.current) setHasProvider(false);
      return;
    }

    if (mounted.current) setHasProvider(true);

    const requestId = ++chainIdRequestId.current;

    try {
      const hexChainId = await provider.request({ method: "eth_chainId" });
      if (requestId !== chainIdRequestId.current) return;
      const parsed = Number(hexChainId);
      if (Number.isFinite(parsed)) {
        if (mounted.current) {
          setChainId(parsed);
          setLoadError(null);
        }
      } else {
        throw new Error("Invalid chain ID format");
      }
    } catch (error) {
      if (requestId !== chainIdRequestId.current) return;
      console.error("Failed to fetch chain ID:", error);
      const syncChainId = getCurrentChainId();
      if (syncChainId !== undefined) {
        if (mounted.current) {
          setChainId(syncChainId);
          setLoadError(null);
        }
      } else {
        if (mounted.current) {
          setLoadError("Unable to determine network. Please check your wallet.");
        }
      }
    }
  }, []);

  useEffect(() => {
    let activeProvider: any | null = null;
    let isMounted = true;

    const handleChainChanged = (hexChainId: string) => {
      chainIdRequestId.current++;
      const parsed = Number(hexChainId);
      if (isMounted && Number.isFinite(parsed)) {
        setChainId(parsed);
        setLoadError(null);
      }
    };

    const setupProvider = (provider: any) => {
      if (!provider || activeProvider) return;
      activeProvider = provider;
      provider.on("chainChanged", handleChainChanged);
      detectChainId();
    };

    const handleEthereumInitialized = () => {
      const provider = getEthereumProvider();
      if (provider) {
        setupProvider(provider);
      }
    };

    const currentProvider = getEthereumProvider();
    if (currentProvider) {
      setupProvider(currentProvider);
    } else {
      window.addEventListener("ethereum#initialized", handleEthereumInitialized);
    }

    return () => {
      isMounted = false;
      chainIdRequestId.current++; 
      if (activeProvider) {
        activeProvider.removeListener("chainChanged", handleChainChanged);
      }
      window.removeEventListener("ethereum#initialized", handleEthereumInitialized);
    };
  }, [detectChainId]);

  if (!hasProvider) {
    return <WalletModal {...props} />;
  }

  if (loadError) {
    return (
      <div role="alert" className="network-load-error">
        <p>{loadError}</p>
        <button onClick={detectChainId} disabled={isSwitching}>
          Retry
        </button>
      </div>
    );
  }

  if (chainId === undefined) {
    return (
      <div role="status" className="network-loading">
        <p>Checking network...</p>
      </div>
    );
  }

  const networkError = !isSupportedChainId(chainId);

  const handleSwitchNetwork = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchToSupportedChain();
      chainIdRequestId.current++; 
      if (!mounted.current) return;
      setChainId(SUPPORTED_CHAIN_ID);
    } catch (error) {
      if (!mounted.current) return;
      setSwitchError(
        error instanceof Error
          ? error.message
          : "Failed to switch network. Please switch manually in your wallet."
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
        <button onClick={handleSwitchNetwork} disabled={isSwitching}>
          {isSwitching ? "Switching..." : "Switch to supported network"}
        </button>
        {switchError && <p className="network-switch-error">{switchError}</p>}
      </div>
    );
  }

  return <WalletModal {...props} />;
}

export type { WalletModalProps as ConnectWalletModalProps };
