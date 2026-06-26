import { DbStream } from '../scripts/reconciliation/types';

/**
 * Mock DB Client for StreamPay.
 * In a real environment, this would connect to PostgreSQL or similar.
 * This mock has been updated to support multi-tenancy for isolation testing.
 */

// New mock data structure for multi-tenancy
const mockDbData: Record<string, DbStream[]> = {
  "tenant_1": [
    {
      id: "stream_1_t1",
      recipient_address: "GDVLR...t1_123",
      total_amount: "1000000000",
      released_amount: "500000000",
      status: "ACTIVE",
      last_sync_ledger: 100,
    },
    {
      id: "stream_2_t1",
      recipient_address: "GDVLR...t1_456",
      total_amount: "2000000000",
      released_amount: "1000000000",
      status: "ACTIVE",
      last_sync_ledger: 101,
    }
  ],
  "tenant_2": [
    {
      id: "stream_1_t2",
      recipient_address: "GCABC...t2_789",
      total_amount: "500000000",
      released_amount: "100000000",
      status: "ACTIVE",
      last_sync_ledger: 200,
    },
  ]
};

export const dbClient = {
  /**
   * Fetch a page of streams from the database for a specific tenant.
   */
  async getStreams(tenantId: string, limit: number, offset: number): Promise<DbStream[]> {
    const streamsList = mockDbData[tenantId] || [];
    return streamsList.slice(offset, offset + limit);
  },

  /**
   * Fetch a single stream by ID for a specific tenant.
   */
  async getStreamById(tenantId: string, id: string): Promise<DbStream | null> {
    const streams = await this.getStreams(tenantId, 10000, 0);
    return streams.find(s => s.id === id) || null;
  },

  /**
   * Update the last run status for a specific tenant.
   * In a real DB, this would write to a tenant-specific table or a table with a tenant_id column.
   */
  async updateLastRunStatus(tenantId: string, status: string, timestamp: number) {
    // In this mock, we just log it to show it's being called per tenant.
    console.log(`[DB] [${tenantId}] Updated last run status to ${status} at ${new Date(timestamp).toISOString()}`);
  }
};

/** For testing purposes to reset state */
export function getMockData() {
  return mockDbData;
}
