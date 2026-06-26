/** @jest-environment node */

import { buildAllowedOriginSet, isOriginAllowed, parseAllowedOrigins, normalizeOrigin, createCorsResponse, applyCorsHeaders, WILDCARD_ORIGIN, DEFAULT_CORS_METHODS, DEFAULT_CORS_HEADERS, DEFAULT_CORS_MAX_AGE_SECONDS } from './cors';

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

  describe('createCorsResponse', () => {
    const allowedOrigins = buildAllowedOriginSet('https://trusted.example.com, http://localhost:3000');

    it('includes allow-origin for an allowed origin', () => {
      const headers = createCorsResponse('https://trusted.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://trusted.example.com');
    });

    it('omits allow-origin for a disallowed origin', () => {
      const headers = createCorsResponse('https://evil.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('sets Vary: Origin when origin is present', () => {
      const headers = createCorsResponse('https://trusted.example.com', allowedOrigins);
      expect(headers.get('Vary')).toBe('Origin');
    });

    it('omits Vary: Origin when origin is absent', () => {
      const headers = createCorsResponse(null, allowedOrigins);
      expect(headers.get('Vary')).toBeNull();
    });

    it('sets allow-methods, allow-headers, and max-age for allowed origins', () => {
      const headers = createCorsResponse('https://trusted.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Methods')).toBe(DEFAULT_CORS_METHODS);
      expect(headers.get('Access-Control-Allow-Headers')).toBe(DEFAULT_CORS_HEADERS);
      expect(headers.get('Access-Control-Max-Age')).toBe(String(DEFAULT_CORS_MAX_AGE_SECONDS));
    });

    it('omits extra CORS headers for disallowed origins', () => {
      const headers = createCorsResponse('https://evil.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Methods')).toBeNull();
      expect(headers.get('Access-Control-Allow-Headers')).toBeNull();
      expect(headers.get('Access-Control-Max-Age')).toBeNull();
    });

    it('allows wildcard origin when present in the set', () => {
      const wildcardSet = buildAllowedOriginSet('*');
      const headers = createCorsResponse('https://anything.example.com', wildcardSet);
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://anything.example.com');
    });

    it('accepts custom methods and headers overrides', () => {
      const headers = createCorsResponse('https://trusted.example.com', allowedOrigins, 'GET,POST', 'x-custom');
      expect(headers.get('Access-Control-Allow-Methods')).toBe('GET,POST');
      expect(headers.get('Access-Control-Allow-Headers')).toBe('x-custom');
    });

    it('returns empty headers for null origin', () => {
      const headers = createCorsResponse(null, allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(headers.get('Vary')).toBeNull();
    });

    it('returns empty headers for undefined origin', () => {
      const headers = createCorsResponse(undefined, allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(headers.get('Vary')).toBeNull();
    });
  });

  describe('applyCorsHeaders', () => {
    const allowedOrigins = buildAllowedOriginSet('https://trusted.example.com');

    it('sets access-control-allow-origin for an allowed origin', () => {
      const headers = new Headers();
      applyCorsHeaders(headers, 'https://trusted.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://trusted.example.com');
    });

    it('does not set access-control-allow-origin for a disallowed origin', () => {
      const headers = new Headers();
      applyCorsHeaders(headers, 'https://evil.example.com', allowedOrigins);
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('sets Vary: Origin when origin is present', () => {
      const headers = new Headers();
      applyCorsHeaders(headers, 'https://trusted.example.com', allowedOrigins);
      expect(headers.get('Vary')).toBe('Origin');
    });

    it('does not set Vary when origin is absent', () => {
      const headers = new Headers();
      applyCorsHeaders(headers, null, allowedOrigins);
      expect(headers.get('Vary')).toBeNull();
    });

    it('preserves existing headers when patching', () => {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      applyCorsHeaders(headers, 'https://trusted.example.com', allowedOrigins);
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://trusted.example.com');
    });
  });
});
