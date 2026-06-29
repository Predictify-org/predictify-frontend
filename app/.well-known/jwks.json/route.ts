/**
 * GET /.well-known/jwks.json
 *
 * Serves the JSON Web Key Set (JWKS) for this service per RFC 7517.
 * External clients and third-party verifiers use this endpoint to
 * obtain the public keys needed to verify JWTs issued by StreamPay.
 *
 * Only public key material is returned. Private keys are NEVER exposed.
 *
 * Cache-Control policy:
 *   - max-age=3600   — clients may cache the JWKS for up to 1 hour.
 *   - stale-while-revalidate=300 — serve stale for 5 min while refreshing.
 *
 * After a key rotation, the retiring key remains in the JWKS response so
 * that already-issued tokens stay verifiable until they expire.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildJwks } from '@/lib/jwks';
import { errorResponse, ErrorCode } from '@/app/lib/errors/server';
import { logger, extractCorrelationContext, correlationContext } from '@/app/lib/logger';

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=300';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = extractCorrelationContext(request.headers);

  return correlationContext.run(ctx, async () => {
    logger.info('JWKS endpoint requested', {
      endpoint: '/.well-known/jwks.json',
      correlation_id: ctx.correlation_id,
    });

    try {
      const jwks = buildJwks();

      logger.info('JWKS served', {
        key_count: jwks.keys.length,
        kids: jwks.keys.map(k => k.kid),
      });

      return NextResponse.json(jwks, {
        status: 200,
        headers: {
          'Cache-Control': CACHE_CONTROL,
          'Content-Type': 'application/json',
          'X-Request-Id': ctx.request_id,
          'X-Correlation-Id': ctx.correlation_id,
        },
      });
    } catch (err) {
      logger.error('Failed to build JWKS response', {
        error: err instanceof Error ? err.message : String(err),
      });

      return errorResponse(
        ErrorCode.JWKS_BUILD_FAILED,
        'Unable to retrieve public keys. Please try again later.',
        500,
      );
    }
  });
}
