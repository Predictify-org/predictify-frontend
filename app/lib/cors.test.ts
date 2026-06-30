/** @jest-environment node */

import { buildAllowedOriginSet, isOriginAllowed, parseAllowedOrigins, normalizeOrigin, WILDCARD_ORIGIN } from './cors';

describe('CORS helpers', () => {
  describe('parseAllowedOrigins', () => {
    it('returns an empty list for unset values', () => {
      expect(parseAllowedOrigins(undefined)).toEqual([]);
    });

    it('parses a comma-separated list and trims whitespace', () => {
      expect(parseAllowedOrigins(' https://a.test , http://localhost:3000 ,* ')).toEqual([
        'https://a.test',
        'http://localhost:3000',
        '*',
      ]);
    });
  });

  describe('normalizeOrigin', () => {
    it('returns wildcard origin directly', () => {
      expect(normalizeOrigin(WILDCARD_ORIGIN)).toBe(WILDCARD_ORIGIN);
    });

    it('normalizes valid origin strings', () => {
      expect(normalizeOrigin('https://foo.example.com/')).toBe('https://foo.example.com');
      expect(normalizeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    });
  });

  describe('buildAllowedOriginSet', () => {
    it('builds a normalized origin set from raw values', () => {
      const origins = buildAllowedOriginSet('https://a.test/, http://localhost:3000, *');
      expect(origins.has('https://a.test')).toBe(true);
      expect(origins.has('http://localhost:3000')).toBe(true);
      expect(origins.has('*')).toBe(true);
    });
  });

  describe('isOriginAllowed', () => {
    it('allows exact matches', () => {
      const allowed = ['https://allowed.example.com', 'http://localhost:3000'];
      expect(isOriginAllowed('https://allowed.example.com', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    });

    it('rejects unlisted origins', () => {
      const allowed = ['https://allowed.example.com'];
      expect(isOriginAllowed('https://evil.example.com', allowed)).toBe(false);
      expect(isOriginAllowed(null, allowed)).toBe(false);
    });

    it('allows wildcard origin when configured', () => {
      const allowed = buildAllowedOriginSet('*');
      expect(isOriginAllowed('https://anything.example.com', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
    });

    it('rejects invalid origin header', () => {
      const allowed = ['https://allowed.example.com'];
      expect(isOriginAllowed('not a url', allowed)).toBe(false);
    });
  });
});
