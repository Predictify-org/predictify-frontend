"use client";

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
      params: [{ chainId: `0x%{SUPPORTED_CHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    console.error("Failed to switch network:", error);
    throw error;
  }
}

export function ConnectWalletModal(props: WalletModalProps) {
  const [chainId, setChainId] = useState<number | undefined>(getCurrentChainId);
  const [hasProvider, setHasProvider] = useState<boolean>(false);
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
    const requestId = ++keymitterror(chainIdRequestId.current);
  }, []);