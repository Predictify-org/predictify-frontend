import {
  computeXdrHash,
  upsertIntent,
  getIntent,
  removeIntent,
  listIntents,
  clearAllIntents,
  clearIntentsForWallet,
} from '../intent';

const STORAGE_KEY = 'predictify:intents:v1';
const TTL_MS = 24 * 60 * 60 * 1000;

function readRaw(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
}

function buildRecord(overrides: Record<string, unknown> = {}) {
  const time = Date.now();
  return {
    key: 'k',
    walletAddress: 'GABC',
    xdrHash: 'hash',
    status: 'built',
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}

describe('intent store', () => {
  beforeEach(() => {
    try { clearAllIntents(); } catch {}
  });

  it('computes a deterministic hash for XDR', async () => {
    const a = await computeXdrHash('hello');
    const b = await computeXdrHash('hello');
    const c = await computeXdrHash('different');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('upserts, retrieves, lists and removes intents', async () => {
    const key = 'test:1';
    const rec = upsertIntent({ key, walletAddress: 'GABC', xdrHash: 'h1', status: 'built', builtXdr: 'xdr' });
    expect(rec.key).toBe(key);

    const loaded = getIntent(key);
    expect(loaded).toBeDefined();
    expect(loaded?.walletAddress).toBe('GABC');

    const listed = listIntents();
    expect(listed.find((i) => i.key === key)).toBeDefined();

    removeIntent(key);
    expect(getIntent(key)).toBeUndefined();
  });

  it('discards records with a missing or wrongly typed status', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      'missing-status': buildRecord({ key: 'missing-status', status: undefined }),
      'typed-status': buildRecord({ key: 'typed-status', status: 42 }),
      'unknown-status': buildRecord({ key: 'unknown-status', status: 'processing' }),
      valid: buildRecord({ key: 'valid' }),
    }));

    expect(listIntents().map((i) => i.key)).toEqual(['valid']);
    expect(getIntent('missing-status')).toBeUndefined();

    const raw = readRaw();
    expect(raw['missing-status']).toBeUndefined();
    expect(raw['typed-status']).toBeUndefined();
    expect(raw['unknown-status']).toBeUndefined();
    expect(raw.valid).toBeDefined();
  });

  it('discards records with a missing or wrongly typed walletAddress', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      'missing-wallet': buildRecord({ key: 'missing-wallet', walletAddress: undefined }),
      'typed-wallet': buildRecord({ key: 'typed-wallet', walletAddress: 7 }),
      valid: buildRecord({ key: 'valid' }),
    }));

    expect(listIntents().map((i) => i.key)).toEqual(['valid']);
    const raw = readRaw();
    expect(raw['missing-wallet']).toBeUndefined();
    expect(raw['typed-wallet']).toBeUndefined();
  });

  it('prunes expired intents on the first read and persists the pruning', () => {
    const stale = Date.now() - TTL_MS - 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      fresh: buildRecord({ key: 'fresh' }),
      stale: buildRecord({ key: 'stale', updatedAt: stale }),
    }));

    expect(listIntents().map((i) => i.key)).toEqual(['fresh']);
    expect(readRaw().stale).toBeUndefined();
    expect(getIntent('stale')).toBeUndefined();
  });

  it('drops signedXdr as soon as a submissionHash exists', () => {
    const key = 'submit:1';
    upsertIntent({ key, walletAddress: 'GABC', xdrHash: 'h', status: 'signed', signedXdr: 'signed-envelope' });
    expect(getIntent(key)?.signedXdr).toBe('signed-envelope');

    upsertIntent({ key, status: 'submitted', submissionHash: 'tx-hash' });
    const submitted = getIntent(key);
    expect(submitted?.submissionHash).toBe('tx-hash');
    expect(submitted?.signedXdr).toBeUndefined();
  });

  it('strips a persisted signedXdr when a submissionHash is already present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      legacy: buildRecord({ key: 'legacy', signedXdr: 'leftover-envelope', submissionHash: 'tx-hash' }),
    }));

    const record = getIntent('legacy');
    expect(record?.signedXdr).toBeUndefined();
    expect((readRaw().legacy as Record<string, unknown>).signedXdr).toBeUndefined();
  });

  it('clears only the intents belonging to the given wallet', () => {
    upsertIntent({ key: 'a1', walletAddress: 'GAAA', xdrHash: 'h1', status: 'built' });
    upsertIntent({ key: 'a2', walletAddress: 'GAAA', xdrHash: 'h2', status: 'signed', signedXdr: 's' });
    upsertIntent({ key: 'b1', walletAddress: 'GBBB', xdrHash: 'h3', status: 'built' });

    clearIntentsForWallet('GAAA');

    expect(getIntent('a1')).toBeUndefined();
    expect(getIntent('a2')).toBeUndefined();
    expect(getIntent('b1')).toBeDefined();
  });
});
