"use client";

import { useState } from "react";

type SwitchNetworkProps = {
  /** Network the wallet is currently connected to. */
  currentNetwork: string;
  /** Network the app requires for the active session. */
  requiredNetwork: string;
  /** One-click switch handler; should resolve once the wallet has switched. */
  onSwitch: (network: string) => Promise<void> | void;
};

/**
 * Detects a wallet/app network mismatch and offers a one-click switch.
 *
 * When the wallet is already on the required network nothing is rendered, so
 * the affordance is invisible in the common (correct) case and only appears
 * when the user is at risk of acting on the wrong network.
 */
export function SwitchNetwork({
  currentNetwork,
  requiredNetwork,
  onSwitch,
}: SwitchNetworkProps) {
  const [switching, setSwitching] = useState(false);

  const matches =
    currentNetwork.toLowerCase() === requiredNetwork.toLowerCase();
  if (matches) return null;

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      await onSwitch(requiredNetwork);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="switch-network" role="alert">
      <span className="switch-network__message">
        Wallet is on <strong>{currentNetwork}</strong>, but this app requires{" "}
        <strong>{requiredNetwork}</strong>.
      </span>
      <button
        type="button"
        className="switch-network__button"
        onClick={() => void handleSwitch()}
        disabled={switching}
        aria-label={`Switch wallet to ${requiredNetwork}`}
      >
        {switching ? "Switching…" : `Switch to ${requiredNetwork}`}
      </button>
    </div>
  );
}
