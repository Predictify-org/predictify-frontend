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
 * Get the Stellar Wallets Kit instance.
 *
 * In E2E test environments (NEXT_PUBLIC_E2E_MOCK_WALLET=1) the real kit is
 * replaced by a lightweight mock object injected by Playwright via
 * `page.addInitScript` before the page scripts run. This keeps the mock
 * entirely out of the production bundle — the flag is tree-shaken by Next.js
 * when the env variable is absent or set to any value other than "1".
 *
 * Uses environment configuration to determine network in production.
 */
export const getKit = (): StellarWalletsKit => {
  if (typeof window === 'undefined') {
    throw new Error('StellarWalletsKit can only be used on the client side');
  }

  // E2E mock seam — only active when NEXT_PUBLIC_E2E_MOCK_WALLET=1 is set.
  // The cast is intentional: the mock satisfies the subset of the kit API that
  // the app calls, and this code path is never reached in production.
  if (process.env.NEXT_PUBLIC_E2E_MOCK_WALLET === '1') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = (window as any).__MOCK_WALLET__;
    if (mock) return mock as unknown as StellarWalletsKit;
  }

  if (!kit) {
    const config = getClientConfig();
    const network = config.stellar.network === 'mainnet' 
      ? WalletNetwork.PUBLIC 
      : WalletNetwork.TESTNET;
    
    kit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  
  return kit;
};
