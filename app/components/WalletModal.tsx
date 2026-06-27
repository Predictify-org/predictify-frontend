"use client";

import React, { useMemo } from "react";
import { Modal } from "./Modal";
import { getSortedProviders, setMRUWalletId, type WalletProvider } from "../state/walletPrefs";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (providerId: string) => void;
}

const PROVIDER_COMPAT: Record<string, { type: string; networks: string[]; docsUrl: string }> = {
  freighter: {
    type: "Extension",
    networks: ["Mainnet", "Testnet"],
    docsUrl: "https://freighter.app/",
  },
  xbull: {
    type: "Extension",
    networks: ["Mainnet", "Testnet"],
    docsUrl: "https://xbull.app/",
  },
  albedo: {
    type: "Web",
    networks: ["Mainnet", "Testnet"],
    docsUrl: "https://albedo.sh/",
  },
  rabet: {
    type: "Extension",
    networks: ["Mainnet", "Testnet"],
    docsUrl: "https://rabet.app/",
  },
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "0.7rem",
  fontWeight: 500,
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  color: "var(--muted-light)",
  lineHeight: 1.4,
};

const docsLinkStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 500,
  color: "var(--muted-light)",
  textDecoration: "none",
  marginLeft: "0.5rem",
  lineHeight: 1.4,
};

export function WalletModal({ isOpen, onClose, onSelect }: WalletModalProps) {
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
        {providers.map((provider) => {
          const compat = PROVIDER_COMPAT[provider.id];
          const ariaLabel = compat
            ? `${provider.name} — ${compat.type}, ${compat.networks.join(", ")}`
            : provider.name;

          return (
            <button
              key={provider.id}
              onClick={() => handleSelect(provider)}
              className="wallet-provider-btn"
              aria-label={ariaLabel}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                padding: "1rem",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--foreground)",
                fontSize: "var(--text-base)",
                cursor: "pointer",
                transition: "background 0.2s",
                textAlign: "left",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--panel-elevated)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "var(--panel)")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{provider.name}</span>
                <span style={{ color: "var(--accent)" }}>&rarr;</span>
              </div>
              {compat && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.375rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <span style={badgeStyle}>{compat.type}</span>
                  {compat.networks.map((net) => (
                    <span key={net} style={badgeStyle}>
                      {net}
                    </span>
                  ))}
                  <a
                    href={compat.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${provider.name} docs`}
                    onClick={(e) => e.stopPropagation()}
                    style={docsLinkStyle}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted-light)")}
                  >
                    Docs &nearr;
                  </a>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
