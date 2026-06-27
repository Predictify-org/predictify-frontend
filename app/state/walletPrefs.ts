/**
 * walletPrefs — lightweight localStorage helpers for wallet user-preferences.
 *
 * Kept intentionally thin so it can be consumed in both React components
 * and non-React utilities without bringing in any framework dependency.
 *
 * Storage key: "predictify_wallet_prefs"
 * Shape: { lastUsedWalletId: string | null }
 */

const STORAGE_KEY = "predictify_wallet_prefs";

export interface WalletPrefs {
  /** The wallet provider ID that was most recently used to connect. */
  lastUsedWalletId: string | null;
}

const DEFAULT_PREFS: WalletPrefs = {
  lastUsedWalletId: null,
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

    const parsed = JSON.parse(raw) as Partial<WalletPrefs>;
    return {
      lastUsedWalletId: parsed.lastUsedWalletId ?? null,
    };
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
