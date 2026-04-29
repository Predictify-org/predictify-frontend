import { NextRequest, NextResponse } from 'next/server';
import { validateConfig } from './app/lib/config/index';
import { buildAllowedOriginSet, isOriginAllowed, DEFAULT_CORS_HEADERS, DEFAULT_CORS_METHODS, DEFAULT_CORS_MAX_AGE_SECONDS } from './app/lib/cors';

// Validate configuration at middleware initialization so invalid CORS settings fail early.
validateConfig();

const allowedOrigins = buildAllowedOriginSet(process.env.ALLOWED_ORIGINS);

export const config = {
  matcher: ['/api/:path*'],
};

function buildCorsHeaders(origin: string) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', DEFAULT_CORS_METHODS);
  headers.set('Access-Control-Allow-Headers', DEFAULT_CORS_HEADERS);
  headers.set('Access-Control-Max-Age', String(DEFAULT_CORS_MAX_AGE_SECONDS));
  headers.set('Vary', 'Origin');
  return headers;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const originAllowed = isOriginAllowed(origin, allowedOrigins);

  if (request.method === 'OPTIONS') {
    if (!originAllowed) {
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(origin!),
    });
  }

  const response = NextResponse.next();

  if (originAllowed) {
    const headers = response.headers;
    headers.set('Access-Control-Allow-Origin', origin!);
    headers.set('Vary', 'Origin');
  }

  return response;
}
