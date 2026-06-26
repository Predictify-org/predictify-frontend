/**
 * Multi-tenancy isolation tests for lib/dbClient.ts
 *
 * Strategy
 * ────────
 * The mock dbClient is designed to serve data partitioned by a tenant ID.
 * These tests verify that concurrent requests from different tenants do not
 * result in data leakage between them.
 *
 * We simulate parallel access from multiple tenants by using `Promise.all`
 * to fire off requests concurrently. Each "worker" for a tenant asserts that
 * the data it receives belongs exclusively to that tenant.
 *
 * No real database connections are made; this tests the isolation logic
 * within the mock client itself.
 */

import { dbClient, getMockData } from './dbClient';

describe('dbClient — multi-tenancy isolation', () => {
  const tenants = ['tenant_1', 'tenant_2'];
  const mockData = getMockData();

  // ══════════════════════════════════════════════════════════════════════════
  // 1. getStreams isolation
  // ══════════════════════════════════════════════════════════════════════════

  describe('getStreams', () => {
    it('returns only tenant_1 streams for tenant_1', async () => {
      const streams = await dbClient.getStreams('tenant_1', 10, 0);
      expect(streams.length).toBe(2);
      expect(streams.every(s => s.id.endsWith('_t1'))).toBe(true);
    });

    it('returns only tenant_2 streams for tenant_2', async () => {
      const streams = await dbClient.getStreams('tenant_2', 10, 0);
      expect(streams.length).toBe(1);
      expect(streams.every(s => s.id.endsWith('_t2'))).toBe(true);
    });

    it('returns an empty array for an unknown tenant', async () => {
      const streams = await dbClient.getStreams('unknown_tenant', 10, 0);
      expect(streams).toEqual([]);
    });

    it('maintains isolation under concurrent access', async () => {
      // Simulate concurrent requests from multiple tenants
      const promises = tenants.map(tenantId => dbClient.getStreams(tenantId, 10, 0));
      const results = await Promise.all(promises);

      const [tenant1Result, tenant2Result] = results;

      // Assert tenant_1 got its data
      expect(tenant1Result.length).toBe(mockData['tenant_1'].length);
      expect(tenant1Result.every(s => s.id.endsWith('_t1'))).toBe(true);

      // Assert tenant_2 got its data
      expect(tenant2Result.length).toBe(mockData['tenant_2'].length);
      expect(tenant2Result.every(s => s.id.endsWith('_t2'))).toBe(true);

      // Cross-check: no data from tenant_2 is in tenant_1's result (and vice-versa)
      const tenant1Ids = new Set(tenant1Result.map(s => s.id));
      const tenant2Ids = new Set(tenant2Result.map(s => s.id));
      for (const id of tenant2Ids) {
        expect(tenant1Ids.has(id)).toBe(false);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. getStreamById isolation
  // ══════════════════════════════════════════════════════════════════════════

  describe('getStreamById', () => {
    it('cannot fetch a stream from another tenant', async () => {
      // tenant_1 tries to fetch a stream belonging to tenant_2
      const streamIdFromTenant2 = mockData['tenant_2'][0].id;
      const result = await dbClient.getStreamById('tenant_1', streamIdFromTenant2);
      expect(result).toBeNull();
    });

    it('maintains isolation for getStreamById under concurrent access', async () => {
      const streamIdT1 = mockData['tenant_1'][0].id;
      const streamIdT2 = mockData['tenant_2'][0].id;

      const [res1, res2, res3, res4] = await Promise.all([
        dbClient.getStreamById('tenant_1', streamIdT1), // Should succeed
        dbClient.getStreamById('tenant_2', streamIdT2), // Should succeed
        dbClient.getStreamById('tenant_1', streamIdT2), // Should fail (return null)
        dbClient.getStreamById('tenant_2', streamIdT1), // Should fail (return null)
      ]);

      expect(res1).not.toBeNull();
      expect(res1?.id).toBe(streamIdT1);
      expect(res2).not.toBeNull();
      expect(res2?.id).toBe(streamIdT2);
      expect(res3).toBeNull();
      expect(res4).toBeNull();
    });
  });
});