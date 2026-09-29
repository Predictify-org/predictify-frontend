import { z } from 'zod';

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

const INTENT_STATUSES = ['built', 'signed', 'submitted', 'confirming', 'success', 'failed'] as const;

const intentRecordSchema = z.object({
  key: z.string(),
  walletAddress: z.string(),
  xdrHash: z.string(),
  status: z.enum(INTENT_STATUSES),
  builtXdr: z.string().optional(),
  signedXdr: z.string().optional(),
  submissionHash: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

function now() {
  return Date.now();
}

interface SanitizedStore {
  map: Record<string, IntentRecord>;
  changed: boolean;
}

// Validate every persisted record and drop malformed or expired entries so a
// tampered localStorage payload can never reach consumers such as useTransaction.
function sanitizeStore(value: unknown): SanitizedStore {
  const map: Record<string, IntentRecord> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { map, changed: true };
  }
  let changed = false;
  const current = now();
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const parsed = intentRecordSchema.safeParse(entry);
    if (!parsed.success) {
      changed = true;
      continue;
    }
    const record = parsed.data;
    if (current - record.updatedAt > DEFAULT_TTL_MS) {
      changed = true;
      continue;
    }
    // A signed envelope must not outlive the submission it belongs to.
    if (record.submissionHash && record.signedXdr !== undefined) {
      delete record.signedXdr;
      changed = true;
    }
    map[key] = record;
  }
  return { map, changed };
}

function safeGetStorage(): Record<string, IntentRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const { map, changed } = sanitizeStore(parsed);
    if (changed) safeSetStorage(map);
    return map;
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
  return map[key];
}

export function listIntents(): IntentRecord[] {
  const map = safeGetStorage();
  return Object.values(map);
}

export function upsertIntent(partial: Partial<IntentRecord> & { key: string; walletAddress?: string; xdrHash?: string; }) {
  const map = safeGetStorage();
  const existing = map[partial.key];
  const time = now();
  const submissionHash = partial.submissionHash ?? existing?.submissionHash;
  const merged: IntentRecord = {
    key: partial.key,
    walletAddress: partial.walletAddress ?? existing?.walletAddress ?? '',
    xdrHash: partial.xdrHash ?? existing?.xdrHash ?? '',
    status: partial.status ?? existing?.status ?? 'built',
    builtXdr: partial.builtXdr ?? existing?.builtXdr,
    // Once a submission hash exists the signed envelope is no longer required.
    signedXdr: submissionHash ? undefined : (partial.signedXdr ?? existing?.signedXdr),
    submissionHash,
    error: partial.error ?? existing?.error,
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
  };
  const parsed = intentRecordSchema.safeParse(merged);
  if (!parsed.success) {
    console.debug('intent: refused to persist an invalid record', parsed.error.issues);
    return existing ?? merged;
  }
  map[partial.key] = parsed.data;
  safeSetStorage(map);
  return parsed.data;
}

export function removeIntent(key: string) {
  const map = safeGetStorage();
  if (map[key]) {
    delete map[key];
    safeSetStorage(map);
  }
}

export function clearIntentsForWallet(walletAddress: string) {
  if (!walletAddress) return;
  const map = safeGetStorage();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (map[key].walletAddress === walletAddress) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) safeSetStorage(map);
}

export function clearAllIntents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.debug('intent: clear failed', err);
  }
}
