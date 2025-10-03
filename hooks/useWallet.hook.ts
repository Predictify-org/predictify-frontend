// import { ISupportedWallet } from "@creit.tech/stellar-wallets-kit";
// import { kit } from "../constants/wallet-kit.constant";
// import { useGlobalAuthenticationStore } from "@/core/store/data";
// import { useRouter } from "next/navigation";

// export const useWallet = () => {
//   const router = useRouter();
//   const { connectWalletStore, disconnectWalletStore } =
//     useGlobalAuthenticationStore();

//   const connectWallet = async () => {
//     await kit.openModal({
//       modalTitle: "Connect to your favorite wallet",
//       onWalletSelected: async (option: ISupportedWallet) => {
//         kit.setWallet(option.id);

//         const { address } = await kit.getAddress();
//         const { name } = option;

//         connectWalletStore(address, name);
//       },
//     });
//   };

//   const disconnectWallet = async () => {
//     await kit.disconnect();
//     disconnectWalletStore();
//     router.push("/");
//   };

//   const handleConnect = async () => {
//     try {
//       await connectWallet();
//     } catch (error) {
//       console.error("Error connecting wallet:", error);
//     }
//   };

//   const handleDisconnect = async () => {
//     try {
//       if (disconnectWallet) {
//         await disconnectWallet();
//       }
//     } catch (error) {
//       console.error("Error disconnecting wallet:", error);
//     }
//   };

//   return {
//     connectWallet,
//     disconnectWallet,
//     handleConnect,
//     handleDisconnect,
//   };
// };

import { useWalletContext } from "@/context/WalletContext";
import {
  FREIGHTER_ID,
  LOBSTR_ID,
  XBULL_ID,
  ALBEDO_ID,
  RABET_ID,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { useState, useEffect } from "react";
import { getWalletKit, isClientSide } from "../constants/wallet-kits.constant";

export const useWallet = () => {
  const walletState = useWalletContext();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(isClientSide());
  }, []);

  const connectWallet = async (walletId: string) => {
    if (!isClient) {
      setError("Wallet operations are only available in the browser");
      return { success: false, error: "Wallet operations are only available in the browser" };
    }

    try {
      setIsConnecting(true);
      setError(null);

      const kit = getWalletKit();
      kit.setWallet(walletId);

      const { address } = await kit.getAddress();

      const walletName =
        walletId === FREIGHTER_ID
          ? "Freighter"
          : walletId === LOBSTR_ID
          ? "LOBSTR"
          : walletId === XBULL_ID
          ? "XBull"
          : walletId === ALBEDO_ID
          ? "Albedo"
          : walletId === RABET_ID
          ? "Rabet"
          : "Unknown Wallet";

      walletState.connect(address, walletName);

      return { success: true, address };
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || "Error connecting wallet";
      setError(errorMessage);
      console.error("Error connecting wallet:", error);
      return { success: false, error: errorMessage };
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!isClient) {
      setError("Wallet operations are only available in the browser");
      return { success: false, error: "Wallet operations are only available in the browser" };
    }

    try {
      setError(null);
      const kit = getWalletKit();
      await kit.disconnect();
      walletState.disconnect();
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || "Error disconnecting wallet";
      setError(errorMessage);
      console.error("Error disconnecting wallet:", error);
      return { success: false, error: errorMessage };
    }
  };

  const signTransaction = async (xdr: string) => {
    if (!isClient) {
      setError("Wallet operations are only available in the browser");
      return { success: false, error: "Wallet operations are only available in the browser" };
    }

    try {
      setError(null);
      if (!walletState.address) {
        throw new Error("No wallet connected");
      }

      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: walletState.address,
        networkPassphrase: WalletNetwork.TESTNET,
      });

      return { success: true, signedTxXdr };
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || "Error signing transaction";
      setError(errorMessage);
      console.error("Error signing transaction:", error);
      return { success: false, error: errorMessage };
    }
  };

  return {
    connectWallet,
    disconnectWallet,
    signTransaction,
    isConnecting,
    error,
    isConnected: walletState.connected,
    walletAddress: walletState.address,
    walletName: walletState.name,
  };
};
