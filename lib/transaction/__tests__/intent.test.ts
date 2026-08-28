import { computeXdrHash, upsertIntent, getIntent, removeIntent, listIntents, clearAllIntents } from '../intent';

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
});
