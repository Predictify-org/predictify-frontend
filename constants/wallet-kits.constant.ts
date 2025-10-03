import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";

let kit: StellarWalletsKit | null = null;

export const getWalletKit = (): StellarWalletsKit => {
  if (typeof window === 'undefined') {
    throw new Error('Wallet kit can only be used in the browser environment');
  }
  
  if (!kit) {
    try {
      kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      });
    } catch (error) {
      console.error('Failed to initialize wallet kit:', error);
      throw new Error('Failed to initialize wallet kit');
    }
  }
  
  return kit;
};

// For backwards compatibility or testing
export const isClientSide = (): boolean => {
  return typeof window !== 'undefined';
};
