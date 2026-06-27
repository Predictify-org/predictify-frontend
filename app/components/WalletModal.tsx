"use client";

import React, { useMemo } from "react";
import { Modal } from "./Modal";
import { getSortedProviders, setMRUWalletId, type WalletProvider } from "../state/walletPrefs";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (providerId: string) => void;
}

export function WalletModal({ isOpen, onClose, onSelect }: WalletModalProps) {
  // Sort providers based on MRU when the modal is opened
  const providers = useMemo(() => {
    if (isOpen) {
      return getSortedProviders();
    }
    return [];
  }, [isOpen]);

  const handleSelect = (provider: WalletProvider) => {
    setMRUWalletId(provider.id);
    onSelect(provider.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Wallet">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSelect(provider)}
            className="wallet-provider-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--foreground)",
              fontSize: "var(--text-base)",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--panel-elevated)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--panel)")}
          >
            <span>{provider.name}</span>
            <span style={{ color: "var(--accent)" }}>&rarr;</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
