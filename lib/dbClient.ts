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
  async getStreams(...args: [string | number, number?, number?]): Promise<DbStream[]> {
    let tenantId = "default";
    let limit = 100;
    let offset = 0;

    if (args.length === 3) {
      [tenantId, limit, offset] = args as [string, number, number];
    } else if (args.length === 2) {
      [limit, offset] = args as [number, number];
    } else if (args.length === 1) {
      [limit] = args as [number];
    }

    const streamsList = mockDbData[tenantId as keyof typeof mockDbData] || [];
    return streamsList.slice(offset, offset + limit);
  },

  /**
   * Fetch a single stream by ID for a specific tenant.
   */
  async getStreamById(...args: [string | number, string?]): Promise<DbStream | null> {
    let tenantId = "default";
    let id = "";

    if (args.length === 2) {
      [tenantId, id] = args as [string, string];
    } else {
      [id] = args as [string];
    }

    const streams = await this.getStreams(tenantId, 10000, 0);
    return streams.find((stream) => stream.id === id) || null;
  },

  /**
   * Update the last run status for a specific tenant.
   * In a real DB, this would write to a tenant-specific table or a table with a tenant_id column.
   */
  async updateLastRunStatus(...args: [string | number, string | number, number?]) {
    let tenantId = "default";
    let status = "UNKNOWN";
    let timestamp = Date.now();

    if (args.length === 3) {
      [tenantId, status, timestamp] = args as [string, string, number];
    } else if (args.length === 2) {
      [status, timestamp] = args as [string, number];
    }

    console.log(`[DB] Updated last run status to ${status}`);
  }
};

/** For testing purposes to reset state */
export function getMockData() {
  return mockDbData;
}
