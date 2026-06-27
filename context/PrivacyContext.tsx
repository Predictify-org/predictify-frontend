"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PrivacyContextType {
  hideBalances: boolean;
  setHideBalances: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'privacy.hideBalances';

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideBalances, setHideBalances] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored !== null) {
        setHideBalances(stored === 'true');
      }
    } catch (e) {
      console.error('Failed to read hideBalances from localStorage', e);
    }
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, hideBalances.toString());
    } catch (e) {
      console.error('Failed to write hideBalances to localStorage', e);
    }
  }, [hideBalances]);

  return (
    <PrivacyContext.Provider value={{ hideBalances, setHideBalances }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return ctx;
}
