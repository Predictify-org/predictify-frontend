import { useWalletContext } from "@/context/WalletContext";
import { WalletNetwork } from "@creit.tech/stellar-wallets-kit";
import { useState } from "react";
import { getKit } from "../constants/wallet-kits.constant";
import { getClientConfig } from "@/lib/config";
import { normalizeContractError } from "@/lib/stellar/contract-error-normalizer";

export const useWallet = () => {
  const walletState = useWalletContext();
  const [signingError, setSigningError] = useState<string | null>(null);

  const signTransaction = async (xdr: string) => {
    if (!walletState.address) return { success: false, error: "No wallet connected", errorKind: "validation" as const };
    setSigningError(null);
    const expectedAddress = walletState.address;
    const expectedGeneration = walletState.identityGeneration;
    try {
      const clientConfig = getClientConfig();
      const networkPassphrase = clientConfig.stellar.network === "mainnet" ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;
      const { signedTxXdr } = await getKit().signTransaction(xdr, { address: expectedAddress, networkPassphrase });
      if (!walletState.isIdentityCurrent(expectedAddress, expectedGeneration)) {
        return { success: false, error: "The active wallet account changed. Review the transaction and try again.", errorKind: "identity_changed" as const };
      }
      return { success: true, signedTxXdr };
    } catch (error: unknown) {
      const rawMessage = (error as Error)?.message || "Error signing transaction";
      const normalized = normalizeContractError(rawMessage);
      const userMessage = normalized.description;
      setSigningError(userMessage);
      return { success: false, error: userMessage, errorKind: "unknown" as const };
    }
  };

  const clearError = () => {
    setSigningError(null);
    walletState.clearOperationError();
  };

  return {
    connectWallet: walletState.connectWallet,
    disconnectWallet: walletState.disconnectWallet,
    signTransaction,
    isConnecting: walletState.operationStatus === "connecting" || walletState.operationStatus === "reconciling",
    isDisconnecting: walletState.operationStatus === "disconnecting",
    isOperationPending: walletState.operationStatus !== "idle",
    operationStatus: walletState.operationStatus,
    activeOperationId: walletState.activeOperationId,
    error: walletState.operationError?.error ?? signingError,
    errorKind: walletState.operationError?.errorKind ?? null,
    clearError,
    identityGeneration: walletState.identityGeneration,
    isConnected: walletState.connected,
    walletAddress: walletState.address,
    walletName: walletState.name,
  };
};
