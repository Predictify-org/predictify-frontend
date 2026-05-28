import { OnChainStream, OnChainCancellationResult, ContractStreamStatus } from '../types';

/**
 * Mock On-Chain Client for StreamPay.
 * In production, this should be replaced with a Soroban RPC-backed adapter.
 * See `contracts/contracts/streampay-stream/README.md` for the contract
 * deployment guide and the expected `OnChainStream` field mapping.
 */
export const onChainClient = {
  async fetchStream(streamId: string): Promise<OnChainStream | null> {
    const mockOnChainData: Record<string, OnChainStream> = {
      "stream_1": {
        id: "stream_1",
        recipient_address: "GDVLR...123",
        token: "XLM",
        total_amount: 1_000_000_000n,
        released_amount: 500_000_000n,
        velocity: 100n,
        last_update_timestamp: Date.now(),
        status: ContractStreamStatus.ACTIVE,
      },
      "stream_2": {
        id: "stream_2",
        recipient_address: "GDVLR...456",
        // Different token from stream_1 — fully isolated escrow.
        token: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH",
        total_amount: 2_000_000_000n,
        released_amount: 1_100_000_000n, // Intentional mismatch for testing
        velocity: 200n,
        last_update_timestamp: Date.now(),
        status: ContractStreamStatus.ACTIVE,
      },
    };

    return mockOnChainData[streamId] || null;
  },

  /**
   * Mock cancel_stream — mirrors the Soroban entrypoint.
   *
   * Escrow-conservation invariant:
   *   recipient_payout + sender_refund === total_amount - released_amount
   *
   * Both legs use the stream's own token; tokens are never mixed.
   * The contract escrow is fully drained after this call.
   */
  async cancelStream(streamId: string): Promise<OnChainCancellationResult | null> {
    const stream = await this.fetchStream(streamId);
    if (!stream) return null;

    // Vested amount: mock at 75% of total for mid-stream cancellation.
    const vestedAmount   = (stream.total_amount * 3n) / 4n;
    const recipientPayout = vestedAmount - stream.released_amount;
    const senderRefund    = stream.total_amount - vestedAmount;

    return {
      stream_id:          streamId,
      recipient_payout:   recipientPayout,
      sender_refund:      senderRefund,
      token:              stream.token,
      recipient_tx_hash:  `mock-cancel-payout-${streamId}`,
      sender_tx_hash:     senderRefund > 0n ? `mock-cancel-refund-${streamId}` : undefined,
      cancelled_at:       Date.now(),
    };
  },
};
