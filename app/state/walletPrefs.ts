/**
 * walletPrefs — lightweight localStorage helpers for wallet user-preferences.
 *
 * Kept intentionally thin so it can be consumed in both React components
 * and non-React utilities without bringing in any framework dependency.
 *
 * Storage key: "predictify_wallet_prefs"
 * Shape: { lastUsedWalletId: string | null; lastUsedWalletNetwork: string | null }
 */

const STORAGE_KEY = "predictify_wallet_prefs";

export interface WalletPrefs {
  /** The wallet provider ID that was most recently used to connect. */
  lastUsedWalletId: string | null;
  /** The network passphrase (e.g. "Testnet") the wallet was connected to when last used, if known. */
  lastUsedWalletNetwork: string | null;
}

const DEFAULT_PREFS: WalletPrefs = {
  lastUsedWalletId: null,
  lastUsedWalletNetwork: null,
};

/**
 * Read the persisted wallet preferences.
 * Returns default values when running server-side or when no entry exists yet.
 */
export function getWalletPrefs(): WalletPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };

    const parsed = JSON.parse(raw) as Partial<WalletPrefs> & Record<string, unknown>;
    return {
      // Preserve unknown future fields so setWalletPrefs round-trips safely
      ...parsed,
      lastUsedWalletId: typeof parsed.lastUsedWalletId === "string" && parsed.lastUsedWalletId.length > 0 ? parsed.lastUsedWalletId : null,
      lastUsedWalletNetwork: typeof parsed.lastUsedWalletNetwork === "string" && parsed.lastUsedWalletNetwork.length > 0 ? parsed.lastUsedWalletNetwork : null,
    } as WalletPrefs;
  } catch {
    // Corrupted storage entry — fall back to defaults.
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Merge the supplied partial preferences into the persisted store.
 */
export function setWalletPrefs(prefs: Partial<WalletPrefs>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getWalletPrefs();
    const updated: WalletPrefs = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded, etc.).
    // Fail silently — the badge simply won't appear next time.
  }
}

/**
 * Convenience: record which wallet was used most recently.
 *
 * @param walletId - The provider ID string (e.g. "freighter", "lobstr").
 */
export function recordLastUsedWallet(walletId: string): void {
  setWalletPrefs({ lastUsedWalletId: walletId });
}

/**
 * Convenience: retrieve just the last-used wallet ID.
 * Returns `null` when no previous selection exists.
 */
export function getLastUsedWalletId(): string | null {
  return getWalletPrefs().lastUsedWalletId;
}

/**
 * Convenience: record the last used wallet along with its connected network.
 *
 * @param walletId - The provider ID string (e.g. "freighter", "lobstr").
 * @param network - The network passphrase or identifier (e.g. "Testnet", "mainnet").
 */
export function recordWalletConnection(walletId: string, network: string): void {
  if (typeof walletId !== "string" || walletId.length === 0) {
    throw new TypeError("walletId must be a non-empty string");
  }
  if (typeof network !== "string" || network.length === 0) {
    throw new TypeError("network must be a non-empty string");
  }
  setWalletPrefs({
    lastUsedWalletId: walletId,
    lastUsedWalletNetwork: network,
  });
}

/**
 * Retrieve the network associated with the last used wallet.
 * Returns `null` when no previous selection exists or the network was not recorded.
 */
export function getLastUsedWalletNetwork(): string | null {
  return getWalletPrefs().lastUsedWalletNetwork;
}

/**
 * Determine whether the stored last-used wallet's network does not match the expected network.
 *
 * This is intended to be called before signing to detect a wallet/network mismatch.
 * Returns `false` when no wallet network has been recorded (mismatch cannot be determined).
 *
 * @param expectedNetwork - The network the signing operation expects (e.g. "Testnet").
 * @throws {TypeError} If expectedNetwork is not a non-empty string.
 */
export function hasWalletNetworkMismatch(expectedNetwork: string): boolean {
  if (typeof expectedNetwork !== "string" || expectedNetwork.length === 0) {
    throw new TypeError("expectedNetwork must be a non-empty string");
  }
  const network = getLastUsedWalletNetwork();
  return network !== null && network !== expectedNetwork;
}
