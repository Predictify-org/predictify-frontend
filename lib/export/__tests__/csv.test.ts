import { neutralizeFormula, toCsv } from '../csv';

interface Row {
  title: string;
  amount: number | string | null | undefined;
  note?: string;
}

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'amount', label: 'Amount' },
  { key: 'note', label: 'Note' },
] as const;

describe('toCsv', () => {
  it('quotes RFC 4180 delimiters and preserves CRLF line endings and unicode', () => {
    const csv = toCsv<Row>(
      [{ title: 'Market, "A"', amount: 12.5, note: 'line one\nline two — 東京' }],
      columns
    );

    expect(csv).toBe(
      'Title,Amount,Note\r\n"Market, ""A""",12.5,"line one\nline two — 東京"'
    );
  });

  it('returns a header-only record for empty rows and supports an Excel BOM', () => {
    expect(toCsv<Row>([], columns)).toBe('Title,Amount,Note');
    expect(toCsv<Row>([], columns, { bom: true })).toBe('\uFEFFTitle,Amount,Note');
  });

  it('serializes dates as ISO-8601', () => {
    expect(
      toCsv([{ occurredAt: new Date('2025-01-02T03:04:05.000Z') }], [
        { key: 'occurredAt', label: 'Date' },
      ])
    ).toBe('Date\r\n2025-01-02T03:04:05.000Z');
  });

  it('neutralizes formula text without changing numeric values', () => {
    const csv = toCsv<Row>(
      [
        { title: '=HYPERLINK("https://example.com")', amount: -5.2, note: "-cmd|' /C calc'!A0" },
        { title: '+SUM(A1:A2)', amount: '\t=1+1', note: '\rformula' },
        { title: '@malicious', amount: null, note: undefined },
      ],
      columns
    );

    expect(csv).toContain("'=HYPERLINK(\"\"https://example.com\"\")");
    expect(csv).toContain(',-5.2,');
    expect(csv).toContain(",'-cmd|' /C calc'!A0");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain(",'\t=1+1");
    expect(csv).toContain(`"'${'\r'}formula"`);
    expect(csv).toContain("'@malicious,,");
    expect(csv).toContain(',,');
    expect(neutralizeFormula(-5.2)).toBe('-5.2');
  });

  it('serializes large row sets', () => {
    const rows = Array.from({ length: 10_000 }, (_, index) => ({
      title: `Market ${index}`,
      amount: index,
    }));

    const csv = toCsv(rows, [
      { key: 'title', label: 'Title' },
      { key: 'amount', label: 'Amount' },
    ]);

    expect(csv.split('\r\n')).toHaveLength(10_001);
    expect(csv.endsWith('Market 9999,9999')).toBe(true);
  });
});
