/** @jest-environment node */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { POST } from './route';
import { JWT_SECRET } from '@/app/lib/auth';
import {
  webhookSecretStore,
  resetWebhookSecretStore,
  MIN_SECRET_LENGTH,
} from '@/app/lib/webhook-secrets';
import { auditLogStore, resetAuditLogStore } from '@/app/lib/audit-log';

function signAccessToken(role: string, actorId: string): string {
  return jwt.sign(
    { sub: `${actorId}-wallet`, role, actorId, iss: 'streampay', aud: 'streampay-api' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

function validSecret(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function adminRequest(body: unknown): Request {
  return new Request('http://localhost/api/webhooks/rotate', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${signAccessToken('admin', 'admin-rotate-1')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function unauthRequest(body: unknown): Request {
  return new Request('http://localhost/api/webhooks/rotate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/rotate', () => {
  beforeEach(() => {
    resetAuditLogStore();
    resetWebhookSecretStore();
  });

  it('returns 200 with rotation result on valid request', async () => {
    const newSecret = validSecret();
    const response = await POST(adminRequest({ secret: newSecret }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.previousSecretExpiresAt).toBeDefined();
    expect(body.data.activatedAt).toBeDefined();
    expect(body.data.previousSecretHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects request without auth header', async () => {
    const response = await POST(unauthRequest({ secret: validSecret() }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects non-admin roles', async () => {
    const request = new Request('http://localhost/api/webhooks/rotate', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${signAccessToken('user', 'user-1')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ secret: validSecret() }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects missing body', async () => {
    const request = new Request('http://localhost/api/webhooks/rotate', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${signAccessToken('admin', 'admin-1')}`,
      },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_REQUEST');
  });

  it('rejects non-object body', async () => {
    const response = await POST(
      adminRequest('not-an-object'),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects body without secret field', async () => {
    const response = await POST(adminRequest({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects secret shorter than minimum length', async () => {
    const response = await POST(adminRequest({ secret: 'short' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects secret identical to current', async () => {
    const current = webhookSecretStore.getCurrentSecret();
    const response = await POST(adminRequest({ secret: current }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an audit log entry on rotation', async () => {
    const newSecret = validSecret();
    await POST(adminRequest({ secret: newSecret }));

    const entries = auditLogStore.list({ action: 'webhook.secret.rotate' });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('webhook.secret.rotate');
    expect(entries[0].actor.role).toBe('admin');
    expect(entries[0].target.id).toBe('system');
  });

  it('previous secret still verifies existing signatures after rotation', async () => {
    const previous = webhookSecretStore.getCurrentSecret();
    const newSecret = validSecret();

    await POST(adminRequest({ secret: newSecret }));

    const secrets = webhookSecretStore.getActiveSigningSecrets();
    expect(secrets).toHaveLength(2);
    expect(secrets).toContain(previous);
    expect(secrets).toContain(newSecret);
  });

  it('new secret works for signing immediately after rotation', async () => {
    const newSecret = validSecret();
    await POST(adminRequest({ secret: newSecret }));

    expect(webhookSecretStore.getCurrentSecret()).toBe(newSecret);
  });
});
