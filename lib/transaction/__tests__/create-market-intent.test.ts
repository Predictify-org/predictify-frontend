/**
 * @jest-environment jsdom
 */

import { Account, Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import {
  buildCreateMarketIntent,
  buildCreateMarketTransaction,
  computeCreateMarketIntentKey,
  CREATE_MARKET_METHOD,
  encodeCreateMarketArgs,
} from "../create-market-intent";
import { clearAllIntents, getIntent, upsertIntent } from "../intent";
import { getNetworkPassphrase } from "@/lib/stellar/transaction";
import type { ValidatedMarketDraft } from "@/lib/market-creation";

// A valid contract StrKey on testnet (used only for encoding assertions).
const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const WALLET = Keypair.random().publicKey();
const OTHER_WALLET = Keypair.random().publicKey();

const DRAFT: ValidatedMarketDraft = {
  title: "Will Argentina win the 2026 World Cup?",
  description: "Resolves YES if Argentina wins the 2026 FIFA World Cup.",
  category: "Sports",
  deadline: new Date("2026-07-01T00:00:00.000Z"),
  outcomes: [{ text: "Yes" }, { text: "No" }],
  isPublic: true,
  featuredEvent: false,
};

function inspectInvocation(xdr: string) {
  const transaction = TransactionBuilder.fromXDR(xdr, getNetworkPassphrase());
  const operation = transaction.operations[0] as unknown as {
    type: string;
    func: {
      invokeContract: () => {
        functionName: () => { toString: () => string };
        args: () => unknown[];
      };
    };
  };

  return {
    transaction,
    operation,
    invocation: operation.func.invokeContract(),
  };
}

beforeEach(() => {
  clearAllIntents();
});

describe("computeCreateMarketIntentKey", () => {
  it("is deterministic for the same draft and wallet", async () => {
    const first = await computeCreateMarketIntentKey(DRAFT, WALLET);
    const second = await computeCreateMarketIntentKey(
      { ...DRAFT, outcomes: DRAFT.outcomes.map((outcome) => ({ ...outcome })) },
      WALLET,
    );

    expect(first.key).toBe(second.key);
    expect(first.draftHash).toBe(second.draftHash);
    expect(first.key).toContain(WALLET);
    expect(first.key).toContain(CREATE_MARKET_METHOD);
  });

  it("changes with the wallet", async () => {
    const first = await computeCreateMarketIntentKey(DRAFT, WALLET);
    const second = await computeCreateMarketIntentKey(DRAFT, OTHER_WALLET);

    expect(first.key).not.toBe(second.key);
  });

  it("changes with on-chain fields and ignores display-only probabilities", async () => {
    const base = await computeCreateMarketIntentKey(DRAFT, WALLET);
    const changedTitle = await computeCreateMarketIntentKey(
      { ...DRAFT, title: `${DRAFT.title} ` },
      WALLET,
    );
    const changedProbabilities = await computeCreateMarketIntentKey(
      {
        ...DRAFT,
        outcomes: DRAFT.outcomes.map((outcome) => ({
          ...outcome,
          probability: 42,
        })),
      },
      WALLET,
    );

    expect(changedTitle.key).not.toBe(base.key);
    expect(changedProbabilities.key).toBe(base.key);
  });
});

describe("buildCreateMarketTransaction", () => {
  it("encodes the create_market invocation with all draft fields", () => {
    const source = new Account(WALLET, "1");
    const transaction = buildCreateMarketTransaction(
      DRAFT,
      WALLET,
      source,
      CONTRACT_ID,
    );

    const { operation, invocation } = inspectInvocation(transaction.toXDR());

    expect(operation.type).toBe("invokeHostFunction");
    expect(invocation.functionName().toString()).toBe(CREATE_MARKET_METHOD);
    expect(invocation.args()).toHaveLength(8);
    expect(encodeCreateMarketArgs(DRAFT, WALLET)).toHaveLength(8);
    expect(transaction.source).toBe(WALLET);
  });
});

describe("buildCreateMarketIntent", () => {
  it("builds and stores the unsigned XDR", async () => {
    const loadAccount = jest.fn().mockResolvedValue(new Account(WALLET, "1"));
    const intent = await buildCreateMarketIntent(DRAFT, WALLET, {
      contractId: CONTRACT_ID,
      loadAccount,
    });

    const xdr = await intent.buildXdr();

    expect(loadAccount).toHaveBeenCalledWith(WALLET);
    expect(loadAccount).toHaveBeenCalledTimes(1);
    expect(xdr).toEqual(expect.any(String));
    expect(xdr.length).toBeGreaterThan(0);
    expect(inspectInvocation(xdr).invocation.functionName().toString()).toBe(
      CREATE_MARKET_METHOD,
    );

    const stored = getIntent(intent.key);
    expect(stored?.status).toBe("built");
    expect(stored?.builtXdr).toBe(xdr);
    expect(stored?.walletAddress).toBe(WALLET);
    expect(stored?.xdrHash).toEqual(expect.any(String));
  });

  it("reuses a stored XDR instead of rebuilding for the same draft", async () => {
    const firstLoad = jest.fn().mockResolvedValue(new Account(WALLET, "1"));
    const first = await buildCreateMarketIntent(DRAFT, WALLET, {
      contractId: CONTRACT_ID,
      loadAccount: firstLoad,
    });
    const firstXdr = await first.buildXdr();

    const secondLoad = jest
      .fn()
      .mockRejectedValue(new Error("Horizon should not be called again"));
    const second = await buildCreateMarketIntent(DRAFT, WALLET, {
      contractId: CONTRACT_ID,
      loadAccount: secondLoad,
    });

    expect(second.key).toBe(first.key);
    await expect(second.buildXdr()).resolves.toBe(firstXdr);
    expect(secondLoad).not.toHaveBeenCalled();
  });

  it("rebuilds after a failed intent and keeps a new XDR", async () => {
    const { key } = await computeCreateMarketIntentKey(DRAFT, WALLET);
    upsertIntent({
      key,
      walletAddress: WALLET,
      xdrHash: "stale",
      status: "failed",
      builtXdr: "STALE_XDR",
    });

    const loadAccount = jest.fn().mockResolvedValue(new Account(WALLET, "1"));
    const intent = await buildCreateMarketIntent(DRAFT, WALLET, {
      contractId: CONTRACT_ID,
      loadAccount,
    });

    const xdr = await intent.buildXdr();
    expect(loadAccount).toHaveBeenCalledTimes(1);
    expect(xdr).not.toBe("STALE_XDR");
    expect(getIntent(key)?.status).toBe("built");
    expect(getIntent(key)?.builtXdr).toBe(xdr);
  });
});
