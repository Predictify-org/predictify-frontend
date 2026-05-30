import { DbStream } from '../scripts/reconciliation/types';

/**
 * Mock DB Client for StreamPay.
 * In a real environment, this would connect to PostgreSQL or similar.
 */
export const dbClient = {
  /**
   * Fetch a page of streams from the database.
   */
  async getStreams(limit: number, offset: number): Promise<DbStream[]> {
    // Mock data
    const streamsList: DbStream[] = [
      {
        id: "stream_1",
        recipient_address: "GDVLR...123",
        total_amount: "1000000000",
        released_amount: "500000000",
        status: "ACTIVE",
        last_sync_ledger: 100,
      },
      {
        id: "stream_2",
        recipient_address: "GDVLR...456",
        total_amount: "2000000000",
        released_amount: "1000000000",
        status: "ACTIVE",
        last_sync_ledger: 101,
      }
    ];

    return streamsList.slice(offset, offset + limit);
  },

  /**
   * Fetch a single stream by ID.
   */
  async getStreamById(id: string): Promise<DbStream | null> {
    const streams = await this.getStreams(10000, 0);
    return streams.find(s => s.id === id) || null;
  },

  async updateLastRunStatus(status: string, timestamp: number) {
    console.log(`[DB] Updated last run status to ${status} at ${new Date(timestamp).toISOString()}`);
  }
};
