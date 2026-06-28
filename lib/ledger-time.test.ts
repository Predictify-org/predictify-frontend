import {
  fromLedgerSeconds,
  toLedgerSeconds,
  ledgersBetween,
  LEDGER_CLOSE_SECONDS,
} from './ledger-time';

describe('fromLedgerSeconds', () => {
  it('converts epoch seconds to a Date', () => {
    const d = fromLedgerSeconds(1_700_000_000);
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBe(1_700_000_000_000);
  });

  it('accepts bigint input', () => {
    expect(fromLedgerSeconds(1_700_000_000n)!.getTime()).toBe(1_700_000_000_000);
  });

  it('returns null for negative and non-finite input', () => {
    expect(fromLedgerSeconds(-1)).toBeNull();
    expect(fromLedgerSeconds(Number.NaN)).toBeNull();
    expect(fromLedgerSeconds(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('toLedgerSeconds', () => {
  it('converts a Date to floored epoch seconds', () => {
    expect(toLedgerSeconds(new Date(1_700_000_500))).toBe(1_700_000);
  });

  it('accepts a millisecond number', () => {
    expect(toLedgerSeconds(2_000)).toBe(2);
  });
});

describe('ledgersBetween', () => {
  it('estimates ledger count using the close interval', () => {
    expect(ledgersBetween(0, LEDGER_CLOSE_SECONDS * 10)).toBe(10);
  });

  it('returns zero when end is not after start', () => {
    expect(ledgersBetween(100, 100)).toBe(0);
    expect(ledgersBetween(200, 100)).toBe(0);
  });
});
