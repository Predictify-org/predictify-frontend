import { safeParseJson, safeStringifyJson, stringifyWithBigInts } from './safe-json';

describe('safeParseJson', () => {
  it('returns the parsed value for valid JSON', () => {
    expect(safeParseJson<{ a: number }>('{"a":1}', { a: 0 })).toEqual({ a: 1 });
  });

  it('returns the fallback for malformed JSON', () => {
    expect(safeParseJson('not json', { ok: false })).toEqual({ ok: false });
  });

  it('returns the fallback for null and empty input', () => {
    expect(safeParseJson(null, 42)).toBe(42);
    expect(safeParseJson(undefined, 42)).toBe(42);
    expect(safeParseJson('', 42)).toBe(42);
  });
});

describe('safeStringifyJson', () => {
  it('stringifies simple values', () => {
    expect(safeStringifyJson({ a: 1 })).toBe('{"a":1}');
  });

  it('returns the fallback on circular references', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(safeStringifyJson(obj, 'fallback')).toBe('fallback');
  });
});

describe('stringifyWithBigInts', () => {
  it('serialises bigints as decimal strings', () => {
    expect(stringifyWithBigInts({ a: 10n, b: 'x' })).toBe('{"a":"10","b":"x"}');
  });

  it('round-trips through JSON.parse without throwing', () => {
    const json = stringifyWithBigInts({ amount: 12345678901234567890n });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
