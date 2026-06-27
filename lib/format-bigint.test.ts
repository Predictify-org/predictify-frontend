import { formatBigInt, parseBigInt, DEFAULT_TOKEN_DECIMALS } from './format-bigint';

describe('formatBigInt', () => {
  it('formats a typical Stellar amount with 7 decimals', () => {
    expect(formatBigInt(123_456_789n, 7)).toBe('12.3456789');
  });

  it('left-pads the fractional component', () => {
    expect(formatBigInt(1_000n, 7)).toBe('0.0001000');
  });

  it('handles zero', () => {
    expect(formatBigInt(0n)).toBe('0.0000000');
  });

  it('preserves the sign for negative amounts', () => {
    expect(formatBigInt(-1_500_000_0n, 7)).toBe('-1.5000000');
  });

  it('produces no decimal point when decimals is 0', () => {
    expect(formatBigInt(42n, 0)).toBe('42');
  });

  it('rejects negative decimals', () => {
    expect(() => formatBigInt(1n, -1)).toThrow(RangeError);
  });
});

describe('parseBigInt', () => {
  it('parses a decimal string at the default precision', () => {
    expect(parseBigInt('12.3456789')).toBe(123_456_789n);
  });

  it('parses a whole number', () => {
    expect(parseBigInt('5')).toBe(50_000_000n);
  });

  it('returns null for malformed input', () => {
    expect(parseBigInt('not a number')).toBeNull();
    expect(parseBigInt('1.2.3')).toBeNull();
    expect(parseBigInt('')).toBeNull();
  });

  it('returns null when the fraction exceeds the precision', () => {
    expect(parseBigInt('0.12345678', 7)).toBeNull();
  });

  it('round-trips with formatBigInt', () => {
    const original = 9_876_543_210n;
    const formatted = formatBigInt(original, DEFAULT_TOKEN_DECIMALS);
    expect(parseBigInt(formatted, DEFAULT_TOKEN_DECIMALS)).toBe(original);
  });
});
