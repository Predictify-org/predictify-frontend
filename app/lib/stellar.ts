export type SettlementReceipt = {
  settledAt: string;
  txHash: string;
};

export type SettleStreamInput = {
  streamId: string;
};

export interface StellarSettlementClient {
  settleStream(input: SettleStreamInput): Promise<SettlementReceipt>;
}

const defaultSettlementClient: StellarSettlementClient = {
  async settleStream(_input: SettleStreamInput): Promise<SettlementReceipt> {
    return {
      settledAt: new Date().toISOString(),
      txHash: `fake-tx-${crypto.randomUUID().slice(0, 8)}`,
    };
  },
};

declare global {
  // Test-only override used by HTTP E2E harness to mock chain calls at the adapter boundary.
  var __STREAMPAY_STELLAR_SETTLEMENT_CLIENT__: StellarSettlementClient | undefined;
}

export function getStellarSettlementClient(): StellarSettlementClient {
  return globalThis.__STREAMPAY_STELLAR_SETTLEMENT_CLIENT__ ?? defaultSettlementClient;
}
