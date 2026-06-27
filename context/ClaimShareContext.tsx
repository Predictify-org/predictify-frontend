"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ClaimShareSheet } from "@/components/share/claim-share-sheet";

interface ClaimShareData {
  marketTitle: string;
  claimAmount: string;
  marketId: string;
  tokenSymbol: string;
}

interface ClaimShareContextType {
  openShareSheet: (data: ClaimShareData) => void;
}

const ClaimShareContext = createContext<ClaimShareContextType | undefined>(undefined);

export function ClaimShareProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ClaimShareData>({
    marketTitle: "",
    claimAmount: "",
    marketId: "",
    tokenSymbol: "",
  });

  const openShareSheet = (newData: ClaimShareData) => {
    setData(newData);
    setIsOpen(true);
  };

  return (
    <ClaimShareContext.Provider value={{ openShareSheet }}>
      {children}
      <ClaimShareSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        marketTitle={data.marketTitle}
        claimAmount={data.claimAmount}
        marketId={data.marketId}
        tokenSymbol={data.tokenSymbol}
      />
    </ClaimShareContext.Provider>
  );
}

export function useClaimShare() {
  const context = useContext(ClaimShareContext);
  if (context === undefined) {
    throw new Error("useClaimShare must be used within a ClaimShareProvider");
  }
  return context;
}
