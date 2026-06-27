import crypto from 'crypto';
import { recordPrivilegedStreamAuditEvent } from '@/app/lib/audit-log';

export const DEFAULT_OVERLAP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const MIN_SECRET_LENGTH = 32;

export const VALID_SECRET_REGEX = /^[A-Za-z0-9+/_=-]{32,}$/;

export interface WebhookSecretState {
  currentSecret: string;
  previousSecret: string | null;
  currentSecretActivatedAt: string;
  previousSecretExpiresAt: string | null;
}

function secretsDiffer(a: string, b: string): boolean {
  if (a.length !== b.length) return true;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  return !crypto.timingSafeEqual(bufA, bufB);
}

export interface RotationResult {
  previousSecretExpiresAt: string;
  activatedAt: string;
  previousSecretHash: string;
}

export class WebhookSecretStore {
  private currentSecret: string;
  private previousSecret: string | null = null;
  private currentSecretActivatedAt: string;
  private previousSecretExpiresAt: string | null = null;
  private readonly overlapWindowMs: number;

  constructor(
    initialSecret?: string,
    overlapWindowMs: number = DEFAULT_OVERLAP_WINDOW_MS,
  ) {
    const env = process.env.NODE_ENV ?? 'development';
    const isDev = env === 'development' || env === 'test';

    const seed = initialSecret ?? process.env.WEBHOOK_SECRET;
    if (!seed) {
      if (isDev) {
        console.warn(
          '[webhook-secrets] WEBHOOK_SECRET is not set. Using insecure dev placeholder. ' +
          'Set WEBHOOK_SECRET in production.',
        );
        this.currentSecret = 'dev-webhook-secret-do-not-use-in-prod-123456';
      } else {
        throw new Error(
          '[webhook-secrets] WEBHOOK_SECRET environment variable is required in production.',
        );
      }
    } else {
      this.validateSecret(seed);
      this.currentSecret = seed;
    }

    this.currentSecretActivatedAt = new Date().toISOString();
    this.overlapWindowMs = overlapWindowMs;
  }

  rotate(newSecret: string, request: Request): RotationResult {
    this.validateSecret(newSecret);

    if (!secretsDiffer(this.currentSecret, newSecret)) {
      throw new Error('WEBHOOK_SECRET_MUST_DIFFER');
    }

    this.previousSecret = this.currentSecret;
    this.currentSecret = newSecret;
    this.currentSecretActivatedAt = new Date().toISOString();
    this.previousSecretExpiresAt = new Date(
      Date.now() + this.overlapWindowMs,
    ).toISOString();

    const previousHash = crypto
      .createHash('sha256')
      .update(this.previousSecret)
      .digest('hex');

    recordPrivilegedStreamAuditEvent({
      action: 'webhook.secret.rotate',
      before: { previousSecretHash: previousHash },
      after: { newSecretHash: this.hashSecret(newSecret) },
      metadata: {
        previousSecretExpiresAt: this.previousSecretExpiresAt,
      },
      request,
      streamId: 'system',
    });

    return {
      previousSecretExpiresAt: this.previousSecretExpiresAt,
      activatedAt: this.currentSecretActivatedAt,
      previousSecretHash: previousHash,
    };
  }

  getActiveSigningSecrets(): string[] {
    this.cleanupExpiredSecrets();
    const secrets: string[] = [this.currentSecret];
    if (this.previousSecret && this.isPreviousSecretValid()) {
      secrets.push(this.previousSecret);
    }
    return secrets;
  }

  getCurrentSecret(): string {
    return this.currentSecret;
  }

  getPreviousSecret(): string | null {
    this.cleanupExpiredSecrets();
    if (this.previousSecret && this.isPreviousSecretValid()) {
      return this.previousSecret;
    }
    return null;
  }

  getState(): Readonly<WebhookSecretState> {
    this.cleanupExpiredSecrets();
    return Object.freeze({
      currentSecret: this.currentSecret,
      previousSecret: this.previousSecret,
      currentSecretActivatedAt: this.currentSecretActivatedAt,
      previousSecretExpiresAt: this.previousSecretExpiresAt,
    });
  }

  reset(seedSecret?: string): void {
    const env = process.env.NODE_ENV ?? 'development';
    this.currentSecret = seedSecret ?? (
      env === 'development' || env === 'test'
        ? 'dev-webhook-secret-do-not-use-in-prod-123456'
        : crypto.randomBytes(48).toString('base64url')
    );
    this.previousSecret = null;
    this.currentSecretActivatedAt = new Date().toISOString();
    this.previousSecretExpiresAt = null;
  }

  private cleanupExpiredSecrets(): void {
    if (
      this.previousSecret &&
      this.previousSecretExpiresAt &&
      Date.now() >= new Date(this.previousSecretExpiresAt).getTime()
    ) {
      this.previousSecret = null;
      this.previousSecretExpiresAt = null;
    }
  }

  private isPreviousSecretValid(): boolean {
    if (!this.previousSecret || !this.previousSecretExpiresAt) return false;
    return Date.now() < new Date(this.previousSecretExpiresAt).getTime();
  }

  private validateSecret(secret: string): void {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `WEBHOOK_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
      );
    }
    if (!VALID_SECRET_REGEX.test(secret)) {
      throw new Error(
        'WEBHOOK_SECRET contains invalid characters. Use alphanumeric, +, /, _, =, or -.',
      );
    }
  }

  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
}

export const webhookSecretStore = new WebhookSecretStore();

export function resetWebhookSecretStore(seed?: string): void {
  webhookSecretStore.reset(seed);
}

export function getActiveSigningSecrets(): string[] {
  return webhookSecretStore.getActiveSigningSecrets();
}
