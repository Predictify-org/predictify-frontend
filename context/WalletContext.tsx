"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WalletContextType {
  address: string | null;
  name: string | null;
  connected: boolean;
  connect: (address: string, name: string) => void;
  disconnect: () => void;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = 'predictify_wallet_state';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load wallet state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(WALLET_STORAGE_KEY);
      if (savedState) {
        const { address, name, connected } = JSON.parse(savedState);
        if (connected && address && name) {
          setAddress(address);
          setName(name);
          setConnected(true);
          console.log('Wallet state restored from localStorage:', { name, address: address.slice(0, 6) + '...' });
        }
      }
    } catch (error) {
      console.error('Error loading wallet state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save wallet state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const state = { address, name, connected };
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
    }
  }, [address, name, connected, isLoading]);

  const connect = (address: string, name: string) => {
    setAddress(address);
    setName(name);
    setConnected(true);
  };

  const disconnect = () => {
    setAddress(null);
    setName(null);
    setConnected(false);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  };

  return (
    <WalletContext.Provider
      value={{ address, name, connected, connect, disconnect, isLoading }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
