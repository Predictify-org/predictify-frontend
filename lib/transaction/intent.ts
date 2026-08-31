export type IntentStatus =
  | 'built'
  | 'signed'
  | 'submitted'
  | 'confirming'
  | 'success'
  | 'failed';

export interface IntentRecord {
  key: string;
  walletAddress: string;
  xdrHash: string;
  status: IntentStatus;
  builtXdr?: string;
  signedXdr?: string;
  submissionHash?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'predictify:intents:v1';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function now() {
  return Date.now();
}

function safeGetStorage(): Record<string, IntentRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, IntentRecord>;
  } catch (err) {
    console.debug('intent: failed to read storage', err);
    return {};
  }
}

function safeSetStorage(map: Record<string, IntentRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.debug('intent: failed to write storage', err);
  }
}

export async function computeXdrHash(xdr: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(xdr);
    const digest = await (globalThis.crypto?.subtle?.digest?.('SHA-256', data) as ArrayBuffer);
    const b = new Uint8Array(digest);
    return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // fallback simple hash (deterministic, not crypto-strong)
    let h = 0;
    for (let i = 0; i < xdr.length; i++) {
      h = (Math.imul(31, h) + xdr.charCodeAt(i)) | 0;
    }
    return 'fallback-' + (h >>> 0).toString(16);
  }
}

export function getIntent(key: string): IntentRecord | undefined {
  const map = safeGetStorage();
  const item = map[key];
  if (!item) return undefined;
  // expire stale entries
  if (now() - item.updatedAt > DEFAULT_TTL_MS) {
    removeIntent(key);
    return undefined;
  }
  return item;
}

export function listIntents(): IntentRecord[] {
  const map = safeGetStorage();
  return Object.values(map).filter((i) => now() - i.updatedAt <= DEFAULT_TTL_MS);
}

export function upsertIntent(partial: Partial<IntentRecord> & { key: string; walletAddress?: string; xdrHash?: string; }) {
  const map = safeGetStorage();
  const existing = map[partial.key];
  const time = now();
  const merged: IntentRecord = {
    key: partial.key,
    walletAddress: partial.walletAddress ?? existing?.walletAddress ?? '',
    xdrHash: partial.xdrHash ?? existing?.xdrHash ?? '',
    status: (partial as any).status ?? existing?.status ?? 'built',
    builtXdr: partial.builtXdr ?? existing?.builtXdr,
    signedXdr: partial.signedXdr ?? existing?.signedXdr,
    submissionHash: partial.submissionHash ?? existing?.submissionHash,
    error: partial.error ?? existing?.error,
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
  };
  map[partial.key] = merged;
  safeSetStorage(map);
  return merged;
}

export function removeIntent(key: string) {
  const map = safeGetStorage();
  if (map[key]) {
    delete map[key];
    safeSetStorage(map);
  }
}

export function clearAllIntents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.debug('intent: clear failed', err);
  }
}
