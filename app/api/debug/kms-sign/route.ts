import { NextResponse } from 'next/server';
import { getSigner } from '@/app/lib/kms/factory';
import { requireInternalServiceAuth } from '@/app/lib/internal-service-auth';
import { createError } from '@/app/lib/errors/mapper';
import type { ErrorCode } from '@/app/lib/errors/types';

const MAX_PAYLOAD_BYTES = 16 * 1024; // 16KB

/**
 * DEBUG API: Test KMS Signing
 *
 * IMPORTANT:
 * - Returns 404 in production to prevent becoming a signing oracle.
 * - Requires internal-service auth in non-production.
 */
export async function POST(request: Request) {
  // Hard-disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { code: 'ROUTE_NOT_FOUND' } }, { status: 404 });
  }

  // Internal-service auth (concealFailure hides auth failures as 404)
  const authResult = await requireInternalServiceAuth(request, { concealFailure: true });
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Enforce content size before parsing JSON
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const n = Number(contentLength);
      if (Number.isFinite(n) && n > MAX_PAYLOAD_BYTES + 1024) {
        return NextResponse.json(createError('INVALID_REQUEST', {}, { requestId: undefined }), {
          status: 422,
        });
      }
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(createError('INVALID_REQUEST'), { status: 400 });
    }

    const { payload } = body as { payload?: unknown };
    if (typeof payload !== 'string') {
      return NextResponse.json(createError('INVALID_REQUEST'), { status: 422 });
    }

    const payloadBytes = Buffer.byteLength(payload, 'utf8');
    if (payloadBytes === 0) {
      return NextResponse.json(createError('MISSING_REQUIRED_FIELD'), { status: 400 });
    }
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        createError(
          'INVALID_FIELD_VALUE' as ErrorCode,
          { meta: { payloadBytes } },
        ),
        { status: 422 }
      );
    }

    // IMPORTANT: do not log payload contents.
    console.info('[kms-sign] signing request', {
      request_path: '/api/debug/kms-sign',
      payloadBytes,
      // Avoid leaking any signature/public key material in logs
    });

    const signer = getSigner();
    const provider = signer.getProviderName();

    const start = Date.now();
    const buffer = Buffer.from(payload, 'utf8');

    const signature = await signer.sign(buffer, {
      auditContext: {
        request_path: '/api/debug/kms-sign',
        actor: 'debug-admin',
      },
    });

    const duration = Date.now() - start;
    const publicKey = await signer.getPublicKey();

    // Route is auth-gated; returning signature/public key is still debug-only.
    return NextResponse.json({
      provider,
      publicKey,
      signature: signature.toString('hex'),
      latency_ms: duration,
      message: `Signed using ${provider}`,
    });
  } catch (error) {
    console.error('[kms-sign] unexpected error');
    return NextResponse.json(createError('INTERNAL_ERROR'), { status: 500 });
  }
}

