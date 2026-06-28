import { NextResponse } from 'next/server';
import { tryAuthenticateRequest } from '@/app/lib/auth';
import { webhookSecretStore, MIN_SECRET_LENGTH } from '@/app/lib/webhook-secrets';

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const auth = tryAuthenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return err('UNAUTHORIZED', 'Admin authentication required', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  const { secret } = body as Record<string, unknown>;
  if (typeof secret !== 'string' || !secret.trim()) {
    return err(
      'VALIDATION_ERROR',
      'Body must contain { secret: string }',
      422,
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    return err(
      'VALIDATION_ERROR',
      `Secret must be at least ${MIN_SECRET_LENGTH} characters`,
      422,
    );
  }

  try {
    const result = webhookSecretStore.rotate(secret.trim(), request);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBHOOK_SECRET_MUST_DIFFER') {
      return err(
        'VALIDATION_ERROR',
        'New secret must differ from the current active secret',
        422,
      );
    }
    throw error;
  }
}
