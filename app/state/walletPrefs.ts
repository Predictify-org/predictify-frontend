/*
 * walletPrefs — lightweight localStorage helpers for wallet user-preferences.
 *
 * Kept intentionally thin so it can be consumed in both React components
 * and non-React utilities without bringing in any framework dependency.
 *
 * Storage key: "predictify_wallet_prefs"
 * Shape: { lastUsedWalletId: string | null; lastUsedWalletNetwork: string | null }
 *
 * NOTE: localStorage operations are synchronous. Within a single tab, calls are
 * serialized by the event loop. Across tabs, writes are atomic but last-writer-wins;
 * callers should read after write to observe the latest state.
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
 * If the stored entry is corrupted, logs a warning and returns defaults.
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
  } catch (error) {
    console.warn('[walletPrefs] Failed to parse stored wallet preferences; using defaults.', error);
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Merge the supplied partial preferences into the persisted store.
 *
 * Pass `null` to clear a field. Passing `undefined` or an empty string is
 * treated as invalid and will throw, to avoid silent data loss.
 *
 * Returns `true` if the write succeeded, `false` if localStorage was
 * unavailable or the write failed (e.g. quota exceeded). The stored value is
 * only updated after a successful write.
 *
 * @throws {TypeError} If `lastUsedWalletId` or `lastUsedWalletNetwork` is
 *   present in `prefs` but is neither a non-empty string nor `null`.
 */
export function setWalletPrefs(prefs: Partial<WalletPrefs>):): boolean {
  if (typeof window === "undefined") return false;

  // Validate known keys to fail fast on invalid input.
  if (
    "lastUsedWalletId" in prefs &&
    prefs.lastUsedWalletId !== null &&
    (typeof prefs.lastUsedWalletId !== "string" || prefs.lastUsedWalletId.length === 0)
  ) {
    throw new TypeError("lastUsedWalletId must be a non-empty string or null");
  }
  if (
    "lastUsedWalletNetwork" in prefs &&
    prefs.lastUsedWalletNetwork !== null &&
    (typeof prefs.lastUsedWalletNetwork !== "string" || prefs.lastUsedWalletNetwork.length === 0)
  ) {
    throw new TypeError("lastUsedWalletNetwork must be a non-empty string or null");
  }

  try {
    const current = getWalletPrefs();
    const updated: WalletPrefs = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error("[walletPrefs] Failed to write wallet preferences.", error);
    return false;
  }
}

/**
 * Convenience: record which wallet was used most recently.
 *
 * @param walletId - The provider ID string (e.g. "freighter", "lobstr").
 * @throws {TypeError} If `walletId`  is not a non-empty string.
 */
export function recordLastUsedWallet(walletId: string): boolean {
  if (typeof walletId !== "string" || walletId.length === 0) {
    throw new TypeError("walletId must be a non-empty string");
  }
  return setWalletPrefs({ lastUsedWalletId: walletId });
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
 * @throws {TypeError} If `walletId` or `network` is not a non-empty string.
 */
export function recordWalletConnection(walletId: string, network: string): boolean {
  if (typeof walletId !== "string" || walletId.length === 0) {
    throw new TypeError("walletId must be a non-empty string");
  }
  if (typeof network !== "string" || network.length === 0) {
    throw new TypeError("network must be a non-empty string");
  }
  return setWalletPrefs({
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
 *
 * Note: Returns `false` when no wallet network has been recorded, because a
 * mismatch cannot be determined. If you need to enforce a known-matching
 * network before signing, use `ensureWalletNetworkMatches` instead.
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

/**
 * Enforce that the stored last-used wallet's network matches the expected network.
 *
 * This is a stricter guard than `hasWalletNetworkMismatch`: it throws when the
 * network is either different *or*unknown, ensuring that signing never proceeds
 * without a verifiable network match.
 *
 * @param expectedNetwork - The network the signing operation expects (e.g. "Testnet").
 * @throws {TypeError} If expectedNetwork is not a non-empty string.
 * @throws {Error} If no wallet network has been recorded, or if the recorded
 *   network differs from `expectedNetwork`.
 */
export function ensureWalletNetworkMatches(expectedNetwork: string): void {
  if (typeof expectedNetwork !== "string" || expectedNetwork.length === 0) {
    throw new TypeError("expectedNetwork must be a non-empty string");
  }
  const network = getLastUsedWalletNetwork();
  if (network === null) {
    throw new Error("No wallet network recorded. Cannot verify network before signing.");
  }
  if (network !== expectedNetwork) {
    throw new Error(`Wallet network mismatch: expected "${expectedNetwork}" but was "${network}".`);
  }
}