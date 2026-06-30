import {
  OnChainStream,
  OnChainCancellationResult,
  ContractStreamStatus,
  SorobanError,
  SorobanErrorCode,
} from '../types';

/**
 * Mock On-Chain Client for StreamPay.
 * In production, this should be replaced with a Soroban RPC-backed adapter.
 * See `contracts/contracts/streampay-stream/README.md` for the contract
 * deployment guide and the expected `OnChainStream` field mapping.
 *
 * ERROR HANDLING CONTRACT
 * -----------------------
 * Every failure path throws a {@link SorobanError} with a stable variant.
 * Callers MUST catch these errors and normalize them via
 * `app/lib/errors/mapper.ts` → `normalizeError()` for Problem+JSON output.
 *
 * | Failure mode                     | Variant thrown                |
 * |----------------------------------|-------------------------------|
 * | Stream not found on-chain        | SorobanErrorCode.StreamNotFound   |
 * | Simulation failed (contract)     | SorobanErrorCode.SimulationFailed |
 * | Simulation RPC timeout           | SorobanErrorCode.SimulationTimeout|
 * | Submit timeout (ledger inclusion)| SorobanErrorCode.SubmitTimeout    |
 * | Submit rejected by network       | SorobanErrorCode.SubmitFailed     |
 * | Invalid tx signature             | SorobanErrorCode.SubmitBadAuth    |
 * | Insufficient funds for fees      | SorobanErrorCode.SubmitInsufficientFunds |
 * | RPC node unavailable             | SorobanErrorCode.RpcUnavailable   |
 * | RPC connection timeout           | SorobanErrorCode.RpcTimeout       |
 * | Contract WASM/instance missing   | SorobanErrorCode.ContractNotFound |
 * | Stream ID already exists         | SorobanErrorCode.StreamAlreadyExists |
 * | Unrecognized failure             | SorobanErrorCode.Unknown          |
 */

const MOCK_ON_CHAIN_DATA: Record<string, OnChainStream> = {
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
    token: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH",
    total_amount: 2_000_000_000n,
    released_amount: 1_100_000_000n,
    velocity: 200n,
    last_update_timestamp: Date.now(),
    status: ContractStreamStatus.ACTIVE,
  },
};

interface OnChainClientConfig {
  simulateRpcTimeout?: boolean;
  simulateSimulationFailed?: boolean;
  simulateRpcUnavailable?: boolean;
  simulateSubmitTimeout?: boolean;
  simulateSubmitFailed?: boolean;
  simulateSubmitBadAuth?: boolean;
  simulateSubmitInsufficientFunds?: boolean;
  simulateUnknownError?: boolean;
}

let _clientConfig: OnChainClientConfig = {};

export function setOnChainClientConfig(config: OnChainClientConfig): void {
  _clientConfig = { ...config };
}

export function resetOnChainClientConfig(): void {
  _clientConfig = {};
}

export const onChainClient = {
  async fetchStream(streamId: string): Promise<OnChainStream> {
    if (_clientConfig.simulateUnknownError) {
      throw new SorobanError(
        SorobanErrorCode.Unknown,
        `Unexpected failure while fetching stream ${streamId}`,
        { statusCode: 500 }
      );
    }

    if (_clientConfig.simulateRpcTimeout) {
      throw new SorobanError(
        SorobanErrorCode.RpcTimeout,
        `Soroban RPC timed out while fetching stream ${streamId}`,
        { statusCode: 504 }
      );
    }

    if (_clientConfig.simulateRpcUnavailable) {
      throw new SorobanError(
        SorobanErrorCode.RpcUnavailable,
        `Soroban RPC node unavailable while fetching stream ${streamId}`,
        { statusCode: 503 }
      );
    }

    if (_clientConfig.simulateSimulationFailed) {
      throw new SorobanError(
        SorobanErrorCode.SimulationFailed,
        `Pre-flight simulation failed for stream ${streamId}: contract revert`,
        { statusCode: 400, meta: { streamId, phase: 'simulation' } }
      );
    }

    const stream = MOCK_ON_CHAIN_DATA[streamId];
    if (!stream) {
      throw new SorobanError(
        SorobanErrorCode.StreamNotFound,
        `Stream ${streamId} does not exist on-chain`,
        { statusCode: 404, meta: { streamId } }
      );
    }

    return stream;
  },

  async cancelStream(streamId: string): Promise<OnChainCancellationResult> {
    if (_clientConfig.simulateUnknownError) {
      throw new SorobanError(
        SorobanErrorCode.Unknown,
        `Unexpected failure while cancelling stream ${streamId}`,
        { statusCode: 500 }
      );
    }

    const stream = await this.fetchStream(streamId);

    if (_clientConfig.simulateSubmitTimeout) {
      throw new SorobanError(
        SorobanErrorCode.SubmitTimeout,
        `Transaction submission timed out waiting for ledger inclusion for stream ${streamId}`,
        { statusCode: 504, meta: { streamId, txHash: `pending-${streamId}` } }
      );
    }

    if (_clientConfig.simulateSubmitFailed) {
      throw new SorobanError(
        SorobanErrorCode.SubmitFailed,
        `Transaction submission rejected by network for stream ${streamId}: txBadSeq`,
        { statusCode: 400, meta: { streamId, reason: 'txBadSeq' } }
      );
    }

    if (_clientConfig.simulateSubmitBadAuth) {
      throw new SorobanError(
        SorobanErrorCode.SubmitBadAuth,
        `Invalid transaction signature for stream ${streamId} cancellation`,
        { statusCode: 400, meta: { streamId } }
      );
    }

    if (_clientConfig.simulateSubmitInsufficientFunds) {
      throw new SorobanError(
        SorobanErrorCode.SubmitInsufficientFunds,
        `Source account lacks sufficient funds for transaction fees on stream ${streamId} cancellation`,
        { statusCode: 400, meta: { streamId } }
      );
    }

    const vestedAmount = (stream.total_amount * 3n) / 4n;
    const recipientPayout = vestedAmount - stream.released_amount;
    const senderRefund = stream.total_amount - vestedAmount;

    return {
      stream_id: streamId,
      recipient_payout: recipientPayout,
      sender_refund: senderRefund,
      token: stream.token,
      recipient_tx_hash: `mock-cancel-payout-${streamId}`,
      sender_tx_hash: senderRefund > 0n ? `mock-cancel-refund-${streamId}` : undefined,
      cancelled_at: Date.now(),
    };
  },

  async createStream(streamId: string, _payload: unknown): Promise<{ stream_id: string; tx_hash: string }> {
    if (_clientConfig.simulateUnknownError) {
      throw new SorobanError(
        SorobanErrorCode.Unknown,
        `Unexpected failure while creating stream ${streamId}`,
        { statusCode: 500 }
      );
    }

    if (MOCK_ON_CHAIN_DATA[streamId]) {
      throw new SorobanError(
        SorobanErrorCode.StreamAlreadyExists,
        `Stream ${streamId} already exists on-chain`,
        { statusCode: 409, meta: { streamId } }
      );
    }

    if (_clientConfig.simulateSimulationFailed) {
      throw new SorobanError(
        SorobanErrorCode.SimulationFailed,
        `Pre-flight simulation failed for stream creation ${streamId}`,
        { statusCode: 400, meta: { streamId, phase: 'create_simulation' } }
      );
    }

    if (_clientConfig.simulateSubmitTimeout) {
      throw new SorobanError(
        SorobanErrorCode.SubmitTimeout,
        `Transaction submission timed out for stream creation ${streamId}`,
        { statusCode: 504, meta: { streamId } }
      );
    }

    return {
      stream_id: streamId,
      tx_hash: `mock-create-${streamId}`,
    };
  },
};