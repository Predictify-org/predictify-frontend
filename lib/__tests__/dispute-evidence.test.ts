import {
  getEvidencePreviewLabel,
  normalizeDisputeEvidence,
} from '@/lib/dispute-evidence';

describe('dispute evidence normalization', () => {
  it('accepts valid https evidence and ignores unsafe values', () => {
    const result = normalizeDisputeEvidence([
      { label: 'Court ruling', url: 'https://example.com/ruling.pdf' },
      { label: 'Private memo', url: 'javascript:alert(1)', isPrivate: true },
      'https://example.com/duplicate.pdf',
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      label: 'Court ruling',
      url: 'https://example.com/ruling.pdf',
      isValid: true,
    });
    expect(result[1]).toMatchObject({
      label: 'Evidence preview',
      url: 'https://example.com/duplicate.pdf',
      isValid: true,
    });
  });

  it('deduplicates repeated evidence entries and preserves public previews', () => {
    const result = normalizeDisputeEvidence([
      'https://example.com/report.pdf',
      'https://example.com/report.pdf',
      { label: 'Official results', url: 'https://example.com/report.pdf' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.com/report.pdf');
    expect(result[0].label).toBe('Evidence preview');
  });

  it('rejects malformed or non-http(s) evidence and falls back to a safe preview label', () => {
    const invalid = normalizeDisputeEvidence(['javascript:alert(1)', 'ftp://example.com/file.txt', 'not-a-url']);

    expect(invalid).toEqual([]);
    expect(getEvidencePreviewLabel('ftp://example.com/file.txt')).toBe('Evidence preview');
  });
});
