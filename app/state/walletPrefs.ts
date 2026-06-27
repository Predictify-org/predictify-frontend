const MRU_WALLET_KEY = "streampay_mru_wallet";

export interface WalletProvider {
  id: string;
  name: string;
  icon?: string;
}

export const defaultProviders: WalletProvider[] = [
  { id: "freighter", name: "Freighter" },
  { id: "xbull", name: "xBull" },
  { id: "albedo", name: "Albedo" },
  { id: "rabet", name: "Rabet" }
];

export function getMRUWalletId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MRU_WALLET_KEY);
}

export function setMRUWalletId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MRU_WALLET_KEY, id);
}

/**
 * Returns the list of providers sorted such that the most recently used (MRU)
 * provider appears first.
 */
export function getSortedProviders(providers: WalletProvider[] = defaultProviders): WalletProvider[] {
  const mruId = getMRUWalletId();
  if (!mruId) return providers;

  const sorted = [...providers];
  const mruIndex = sorted.findIndex(p => p.id === mruId);
  
  if (mruIndex > 0) {
    const [mruProvider] = sorted.splice(mruIndex, 1);
    sorted.unshift(mruProvider);
  }
  
  return sorted;
}
