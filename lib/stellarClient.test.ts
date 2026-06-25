import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "stellar-sdk";
import { Server } from "stellar-sdk/rpc";
import { StellarClient } from "./stellarClient";

describe("StellarClient fee bump support", () => {
  const sourceKeypair = Keypair.random();
  const feeBumpKeypair = Keypair.random();
  const account = new Account(sourceKeypair.publicKey(), "1");
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: Keypair.random().publicKey(),
      asset: Asset.native(),
      amount: "1",
    }))
    .setTimeout(30)
    .build();

  const signedTransactionXdr = transaction.toXDR();

  const metrics = {
    increment: jest.fn(),
    gauge: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it("submits the original transaction when median fee is below threshold", async () => {
    (global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        fee_stats: { p50: 50, max_fee: 100, min_accepted_fee: 10 },
      }),
    });

    const client = new StellarClient({
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: Networks.TESTNET,
      feeBumpPolicy: { threshold: 100 },
      metrics,
    });

    const submitMock = jest.fn().mockResolvedValue({ result: "ok" });
    (client as any).server = { submitTransaction: submitMock, serverURL: new URL("https://horizon-testnet.stellar.org/") };

    const result = await client.submitTransaction(signedTransactionXdr, feeBumpKeypair.secret());

    expect(result).toEqual({ result: "ok" });
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith(signedTransactionXdr);
    expect(metrics.increment).toHaveBeenCalledWith("stellar.transaction.feeBumpSkipped");
    expect(metrics.gauge).toHaveBeenCalledWith("stellar.feeStats.median", 50);
  });

  it("wraps the transaction in a fee-bump envelope when median fee exceeds threshold", async () => {
    (global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        fee_stats: { p50: 200, max_fee: 500, min_accepted_fee: 20 },
      }),
    });

    const client = new StellarClient({
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: Networks.TESTNET,
      feeBumpPolicy: { threshold: 100, multiplier: 2, maxFeePerOp: 1000, maxTotalFee: 2000 },
      metrics,
    });

    const submitMock = jest.fn().mockResolvedValue({ result: "ok" });
    (client as any).server = { submitTransaction: submitMock, serverURL: new URL("https://horizon-testnet.stellar.org/") };

    const result = await client.submitTransaction(signedTransactionXdr, feeBumpKeypair.secret());

    expect(result).toEqual({ result: "ok" });
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock.mock.calls[0][0]).not.toEqual(signedTransactionXdr);
    expect(metrics.increment).toHaveBeenCalledWith("stellar.transaction.feeBumpTriggered");
    expect(metrics.gauge).toHaveBeenCalledWith("stellar.feeStats.median", 200);
    expect(metrics.gauge).toHaveBeenCalledWith(expect.stringContaining("stellar.transaction.feeBumpFee"), expect.any(Number));
  });
});
