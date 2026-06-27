/** @jest-environment node */

import {
  REQUEST_FINGERPRINT_HEADER,
  computeRequestFingerprint,
  extractClientIp,
  extractFingerprintSignals,
  getRequestFingerprintFromHeaders,
  normalizeFingerprintSignals,
} from './fingerprint';

describe('request fingerprinting', () => {
  it('hashes stable signals deterministically', async () => {
    const signals = {
      acceptEncoding: 'gzip, br',
      acceptLanguage: 'en-US,en;q=0.9',
      clientIp: '203.0.113.10',
      method: 'POST',
      pathname: '/api/v2/streams',
      userAgent: 'StreamPay-Test/1.0',
    };

    const first = await computeRequestFingerprint(signals);
    const second = await computeRequestFingerprint(signals);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
  });

  it('normalizes header ordering and casing before hashing', async () => {
    const baseline = await computeRequestFingerprint({
      acceptEncoding: 'gzip, br',
      acceptLanguage: 'en-us',
      clientIp: '203.0.113.10',
      method: 'post',
      pathname: '/api/v2/streams/',
      userAgent: '  StreamPay-Test/1.0  ',
    });

    const normalized = await computeRequestFingerprint(
      normalizeFingerprintSignals({
        acceptEncoding: 'br,gzip',
        acceptLanguage: 'EN-US,fr;q=0.8',
        clientIp: '203.0.113.10',
        method: 'POST',
        pathname: '/api/v2/streams',
        userAgent: 'streampay-test/1.0',
      }),
    );

    expect(baseline).toBe(normalized);
  });

  it('changes the hash when fraud-relevant signals change', async () => {
    const base = {
      acceptEncoding: 'gzip',
      acceptLanguage: 'en-us',
      clientIp: '203.0.113.10',
      method: 'POST',
      pathname: '/api/v2/streams',
      userAgent: 'streampay-test/1.0',
    };

    const original = await computeRequestFingerprint(base);
    const differentIp = await computeRequestFingerprint({
      ...base,
      clientIp: '198.51.100.4',
    });
    const differentPath = await computeRequestFingerprint({
      ...base,
      pathname: '/api/auth/wallet',
    });

    expect(differentIp).not.toBe(original);
    expect(differentPath).not.toBe(original);
  });

  it('extracts the first forwarded IP hop only', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 10.0.0.5',
      'x-real-ip': '10.0.0.5',
    });

    expect(extractClientIp(headers)).toBe('203.0.113.10');
  });

  it('falls back to unknown when no client IP headers are present', () => {
    expect(extractClientIp(new Headers())).toBe('unknown');
  });

  it('extracts normalized signals from a Request object', () => {
    const request = new Request('https://api.example.com/api/v2/streams/', {
      method: 'post',
      headers: {
        'accept-encoding': 'br, gzip',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'StreamPay-Test/1.0',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    expect(extractFingerprintSignals(request)).toEqual({
      acceptEncoding: 'br,gzip',
      acceptLanguage: 'en-us',
      clientIp: '203.0.113.10',
      method: 'POST',
      pathname: '/api/v2/streams',
      userAgent: 'streampay-test/1.0',
    });
  });

  it('validates fingerprint headers before reuse', () => {
    const valid = new Headers({
      [REQUEST_FINGERPRINT_HEADER]: 'a'.repeat(64),
    });
    const invalid = new Headers({
      [REQUEST_FINGERPRINT_HEADER]: 'not-a-hash',
    });

    expect(getRequestFingerprintFromHeaders(valid)).toBe('a'.repeat(64));
    expect(getRequestFingerprintFromHeaders(invalid)).toBeNull();
  });
});
