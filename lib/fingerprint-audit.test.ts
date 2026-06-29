/** @jest-environment node */

import {
  auditLogStore,
} from '@/app/lib/audit-log';
import {
  recordRequestFingerprintAudit,
} from '@/lib/fingerprint-audit';
import { REQUEST_FINGERPRINT_AUDIT_ACTION, REQUEST_FINGERPRINT_HEADER } from '@/lib/fingerprint';

describe('request fingerprint audit integration', () => {
  beforeEach(() => {
    auditLogStore.reset([]);
  });

  it('appends a request fingerprint audit entry with correlation metadata', async () => {
    const request = new Request('https://api.example.com/api/auth/wallet', {
      method: 'POST',
      headers: {
        'x-request-id': 'req_fingerprint_audit_1',
        [REQUEST_FINGERPRINT_HEADER]: 'b'.repeat(64),
        'x-streampay-actor-id': 'ops-admin-1',
        'x-streampay-actor-role': 'admin',
      },
    });

    await recordRequestFingerprintAudit(request);

    const entries = auditLogStore.list({ action: REQUEST_FINGERPRINT_AUDIT_ACTION });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: REQUEST_FINGERPRINT_AUDIT_ACTION,
      requestId: 'req_fingerprint_audit_1',
      target: {
        id: '/api/auth/wallet',
        type: 'request',
      },
      metadata: {
        method: 'POST',
        pathname: '/api/auth/wallet',
        requestFingerprint: 'b'.repeat(64),
      },
    });
  });
});
