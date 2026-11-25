/**
 * Mock Stellar wallet fixture for Playwright end-to-end tests.
 *
 * Usage — call `injectMockWallet(page)` before the page's own scripts run:
 *
 *   test.beforeEach(async ({ page }) => {
 *     await injectMockWallet(page);
 *     await page.goto('/');
 *   });
 *
 * The injection patches `window.__MOCK_WALLET__` with a minimal Stellar
 * Wallets Kit–compatible surface. The app reads NEXT_PUBLIC_E2E_MOCK_WALLET
 * at startup (set by playwright.config.ts webServer.env) and swaps getKit()
 * for the mock implementation when the flag is present.
 *
 * Three personas are provided:
 *  - DEFAULT  — connected, signs successfully.
 *  - REJECTED — connected, but every signTransaction call throws "User rejected".
 *  - DISCONNECTED — not connected; getAddress() rejects immediately.
 */

import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Well-known test fixtures
// ---------------------------------------------------------------------------

export const MOCK_PUBLIC_KEY =
  "GDUMMYTESTWALLETADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVW";

export const MOCK_SIGNED_XDR =
  "AAAAAgAAAABMOCKSIGNEDTRANSACTIONXDRPLACEHOLDERFORTESTING";

// ---------------------------------------------------------------------------
// Injection scripts
// ---------------------------------------------------------------------------

/**
 * Default persona: connects and signs without errors.
 */
export async function injectMockWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ publicKey, signedXdr }: { publicKey: string; signedXdr: string }) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (window as any).__MOCK_WALLET__ = {
        persona: "default",
        publicKey,
        signedXdr,
        /** Mimic StellarWalletsKit.getAddress() */
        getAddress: () => Promise.resolve({ address: publicKey }),
        /** Mimic StellarWalletsKit.signTransaction() */
        signTransaction: (_xdr: string) =>
          Promise.resolve({ signedTxXdr: signedXdr }),
        /** Mimic StellarWalletsKit.disconnect() */
        disconnect: () => Promise.resolve(),
        /** Mimic StellarWalletsKit.setWallet() */
        setWallet: (_id: string) => {},
        /** Mimic StellarWalletsKit.getSupportedWallets() */
        getSupportedWallets: () =>
          Promise.resolve([{ id: "freighter", name: "Freighter", isAvailable: true }]),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    { publicKey: MOCK_PUBLIC_KEY, signedXdr: MOCK_SIGNED_XDR },
  );
}

/**
 * Rejection persona: signTransaction always throws a "User rejected" error.
 * Useful for testing cancel / rejection paths.
 */
export async function injectRejectedWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ publicKey }: { publicKey: string }) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (window as any).__MOCK_WALLET__ = {
        persona: "rejected",
        publicKey,
        getAddress: () => Promise.resolve({ address: publicKey }),
        signTransaction: () =>
          Promise.reject(new Error("User rejected the request.")),
        disconnect: () => Promise.resolve(),
        setWallet: (_id: string) => {},
        getSupportedWallets: () =>
          Promise.resolve([{ id: "freighter", name: "Freighter", isAvailable: true }]),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    { publicKey: MOCK_PUBLIC_KEY },
  );
}

/**
 * Disconnected persona: getAddress() rejects — simulates a wallet that is
 * locked or has no extension installed.
 */
export async function injectDisconnectedWallet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).__MOCK_WALLET__ = {
      persona: "disconnected",
      getAddress: () => Promise.reject(new Error("Wallet not found")),
      signTransaction: () => Promise.reject(new Error("Wallet not connected")),
      disconnect: () => Promise.resolve(),
      setWallet: (_id: string) => {},
      getSupportedWallets: () =>
        Promise.resolve([{ id: "freighter", name: "Freighter", isAvailable: false }]),
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}
