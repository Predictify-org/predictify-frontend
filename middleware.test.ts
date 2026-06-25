/** @jest-environment node */

describe('CORS middleware', () => {
  let middleware: any;

  beforeEach(async () => {
    jest.resetModules();

    (process.env as any).STELLAR_NETWORK = 'testnet';
    (process.env as any).JWT_SECRET = 'test-secret-at-least-32-characters-long';
    (process.env as any).NODE_ENV = 'production';
    (process.env as any).ALLOWED_ORIGINS = 'https://allowed.example.com';

    const imported = await import('./middleware');
    middleware = imported.middleware;
  });

  afterEach(() => {
    delete (process.env as any).STELLAR_NETWORK;
    delete (process.env as any).JWT_SECRET;
    delete (process.env as any).NODE_ENV;
    delete (process.env as any).ALLOWED_ORIGINS;
  });

  it('adds CORS headers for allowed origins on normal requests', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { origin: 'https://allowed.example.com' },
    });

    const response = await middleware(request as any);

    expect(response.headers.get('access-control-allow-origin')).toBe('https://allowed.example.com');
    expect(response.headers.get('vary')).toBe('Origin');
  });

  it('does not reflect a disallowed origin', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'GET',
      headers: { origin: 'https://evil.example.com' },
    });

    const response = await middleware(request as any);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('vary')).toBeNull();
  });

  it('returns a preflight response with explicit headers for allowed origins', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://allowed.example.com',
        'access-control-request-method': 'POST',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://allowed.example.com');
    expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    expect(response.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(response.headers.get('access-control-max-age')).toBe('600');
  });

  it('returns a minimal preflight response for disallowed origins', async () => {
    const request = new Request('https://api.example.com/api/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'POST',
      },
    });

    const response = await middleware(request as any);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
