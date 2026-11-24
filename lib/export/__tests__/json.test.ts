import { toJson } from '../json';

describe('toJson', () => {
  it('preserves selected column order, serializes dates as ISO, and normalizes missing values', () => {
    const result = toJson(
      [{
        name: 'Café',
        occurredAt: new Date('2025-01-02T03:04:05.000Z'),
        amount: null,
        missing: undefined,
        ignored: true,
      }],
      [
        { key: 'name', label: 'Name' },
        { key: 'occurredAt', label: 'Occurred at' },
        { key: 'amount', label: 'Amount' },
        { key: 'missing', label: 'Missing' },
      ]
    );

    expect(result).toBe(`[
  {
    "name": "Café",
    "occurredAt": "2025-01-02T03:04:05.000Z",
    "amount": null,
    "missing": null
  }
]`);
  });
});
