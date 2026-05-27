import { OnChainStream, ContractStreamStatus } from '../types';

/**
 * Mock On-Chain Client for StreamPay.
 * In production, this would use the Stellar SDK or a Soroban RPC client.
 */
export const onChainClient = {
  async fetchStream(streamId: string): Promise<OnChainStream | null> {
    // Mock mapping
    const mockOnChainData: Record<string, OnChainStream> = {
      "stream_1": {
        id: "stream_1",
        recipient_address: "GDVLR...123",
        token: "XLM",
        total_amount: 1000000000n,
        released_amount: 500000000n,
        velocity: 100n,
        last_update_timestamp: Date.now(),
        status: ContractStreamStatus.ACTIVE,
      },
      "stream_2": {
        id: "stream_2",
        recipient_address: "GDVLR...456",
        // Different token from stream_1 — fully isolated escrow.
        token: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH",
        total_amount: 2000000000n,
        released_amount: 1100000000n, // Intentional mismatch for testing
        velocity: 200n,
        last_update_timestamp: Date.now(),
        status: ContractStreamStatus.ACTIVE,
      }
    };

    return mockOnChainData[streamId] || null;
  }
};
