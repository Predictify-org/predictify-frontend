const RECENT_RECIPIENTS_KEY = "streampay_recent_recipients";
const MAX_RECENT = 6;

export interface RecentRecipient {
  address: string;
  addedAt: number;
}

export function getRecentRecipients(): RecentRecipient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_RECIPIENTS_KEY);
    return raw ? (JSON.parse(raw) as RecentRecipient[]) : [];
  } catch {
    return [];
  }
}

/**
 * Prepends `address` to the recent-recipients list, deduplicating and capping
 * at MAX_RECENT entries. No-ops for empty/whitespace-only addresses.
 */
export function addRecentRecipient(address: string): void {
  if (typeof window === "undefined") return;
  const trimmed = address.trim();
  if (!trimmed) return;

  const deduped = getRecentRecipients().filter((r) => r.address !== trimmed);
  const updated: RecentRecipient[] = [
    { address: trimmed, addedAt: Date.now() },
    ...deduped,
  ].slice(0, MAX_RECENT);

  localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(updated));
}

export function clearRecentRecipients(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_RECIPIENTS_KEY);
}
