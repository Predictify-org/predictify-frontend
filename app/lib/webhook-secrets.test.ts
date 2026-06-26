import crypto from 'crypto';
import {
  WebhookSecretStore,
  DEFAULT_OVERLAP_WINDOW_MS,
  MIN_SECRET_LENGTH,
} from '@/app/lib/webhook-secrets';
import { resetAuditLogStore } from '@/app/lib/audit-log';

function validSecret(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function mockRequest(): Request {
  return new Request('http://localhost/api/webhooks/rotate', {
    method: 'POST',
    headers: { 'x-request-id': 'test-rotate-1' },
  });
}

describe('WebhookSecretStore', () => {
  let store: WebhookSecretStore;

  beforeEach(() => {
    resetAuditLogStore();
    store = new WebhookSecretStore(validSecret(), DEFAULT_OVERLAP_WINDOW_MS);
  });

  describe('initial state', () => {
    it('has only a single active secret', () => {
      const secrets = store.getActiveSigningSecrets();
      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toBeDefined();
      expect(secrets[0].length).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
    });

    it('has no previous secret', () => {
      expect(store.getPreviousSecret()).toBeNull();
    });

    it('reports correct initial state', () => {
      const state = store.getState();
      expect(state.previousSecret).toBeNull();
      expect(state.previousSecretExpiresAt).toBeNull();
      expect(state.currentSecret).toBeDefined();
      expect(state.currentSecretActivatedAt).toBeDefined();
    });
  });

  describe('rotation', () => {
    it('creates a valid current/previous pair after rotation', () => {
      const newSecret = validSecret();
      const result = store.rotate(newSecret, mockRequest());

      expect(result.previousSecretExpiresAt).toBeDefined();
      expect(result.activatedAt).toBeDefined();
      expect(result.previousSecretHash).toMatch(/^[a-f0-9]{64}$/);

      const secrets = store.getActiveSigningSecrets();
      expect(secrets).toHaveLength(2);
      expect(secrets[0]).toBe(newSecret);
    });

    it('rejects a secret identical to the current one', () => {
      const current = store.getCurrentSecret();
      expect(() => store.rotate(current, mockRequest())).toThrow(
        'WEBHOOK_SECRET_MUST_DIFFER',
      );
    });

    it('rejects secrets shorter than minimum length', () => {
      expect(() => store.rotate('short', mockRequest())).toThrow(
        `at least ${MIN_SECRET_LENGTH}`,
      );
    });

    it('rejects empty secrets', () => {
      expect(() => store.rotate('', mockRequest())).toThrow(
        `at least ${MIN_SECRET_LENGTH}`,
      );
    });

    it('rejects secrets with invalid characters', () => {
      const invalid = 'a'.repeat(32) + '\n\t';
      expect(() => store.rotate(invalid, mockRequest())).toThrow(
        'contains invalid characters',
      );
    });

    it('the previous secret can still verify after rotation', () => {
      const previous = store.getCurrentSecret();
      const newSecret = validSecret();
      store.rotate(newSecret, mockRequest());

      expect(store.getPreviousSecret()).toBe(previous);
      const secrets = store.getActiveSigningSecrets();
      expect(secrets).toContain(previous);
      expect(secrets).toContain(newSecret);
    });
  });

  describe('overlap window', () => {
    it('expires previous secret after the overlap window', () => {
      const store = new WebhookSecretStore(
        validSecret(),
        10, // 10 ms overlap
      );

      const previous = store.getCurrentSecret();
      store.rotate(validSecret(), mockRequest());
      expect(store.getPreviousSecret()).toBe(previous);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(store.getPreviousSecret()).toBeNull();
          expect(store.getActiveSigningSecrets()).toHaveLength(1);
          resolve();
        }, 20);
      });
    });

    it('does not expire previous secret before the window', () => {
      const store = new WebhookSecretStore(validSecret(), 10_000);

      store.rotate(validSecret(), mockRequest());
      expect(store.getPreviousSecret()).not.toBeNull();
      expect(store.getActiveSigningSecrets()).toHaveLength(2);
    });
  });

  describe('getActiveSigningSecrets', () => {
    it('returns only current when no previous secret', () => {
      expect(store.getActiveSigningSecrets()).toHaveLength(1);
    });

    it('returns both during overlap window', () => {
      store.rotate(validSecret(), mockRequest());
      expect(store.getActiveSigningSecrets()).toHaveLength(2);
    });

    it('returns only current after expiry', () => {
      const store = new WebhookSecretStore(validSecret(), 1);
      store.rotate(validSecret(), mockRequest());

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(store.getActiveSigningSecrets()).toHaveLength(1);
          resolve();
        }, 10);
      });
    });
  });

  describe('getState', () => {
    it('returns a frozen snapshot', () => {
      const state = store.getState();
      expect(() => {
        (state as Record<string, unknown>).currentSecret = 'hacked';
      }).toThrow();
    });

    it('reflects rotation correctly', () => {
      const newSecret = validSecret();
      store.rotate(newSecret, mockRequest());
      const state = store.getState();

      expect(state.currentSecret).toBe(newSecret);
      expect(state.previousSecret).not.toBeNull();
      expect(state.previousSecretExpiresAt).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('clears state back to single secret', () => {
      store.rotate(validSecret(), mockRequest());
      expect(store.getActiveSigningSecrets()).toHaveLength(2);

      store.reset();
      expect(store.getActiveSigningSecrets()).toHaveLength(1);
      expect(store.getPreviousSecret()).toBeNull();
    });
  });
});
