import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { getClientConfig } from "@/lib/config";

// Initialize kit only on client side to avoid SSR issues
let kit: StellarWalletsKit | null = null;

/**
 * Get the Stellar Wallets Kit instance
 * Uses environment configuration to determine network
 */
export const getKit = (): StellarWalletsKit => {
  if (typeof window === 'undefined') {
    throw new Error('StellarWalletsKit can only be used on the client side');
  }
  
  if (!kit) {
    const config = getClientConfig();
    const network = config.stellar.network === 'mainnet' 
      ? WalletNetwork.MAINNET 
      : WalletNetwork.TESTNET;
    
    kit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  
  return kit;
};
