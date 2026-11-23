import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Horizon,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import { env } from "@/lib/env";
import {
  canonicalizeMarketDraft,
  type ValidatedMarketDraft,
} from "@/lib/market-creation";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/transaction";
import {
  computeXdrHash,
  getIntent,
  upsertIntent,
} from "@/lib/transaction/intent";

/**
 * Builds the Soroban `create_market` invocation.
 *
 * This is the single place where market drafts are encoded for the contract.
 * The checked-in contract sources do not expose a `create_market` entry point
 * yet, so the argument order below is the agreed integration contract:
 *
 *   create_market(
 *     creator: Address,
 *     title: String,
 *     description: String,
 *     category: String,
 *     deadline: u64,        // unix seconds
 *     outcomes: Vec<String>,
 *     is_public: bool,
 *     featured: bool,
 *   )
 *
 * Update this function (and its tests) when the contract ABI is published.
 */
export const CREATE_MARKET_METHOD = "create_market";

export interface CreateMarketIntent {
  /** Deterministic key derived from the wallet and the on-chain draft fields. */
  key: string;
  draftHash: string;
  /** Builds (or reuses) the unsigned create_market transaction XDR. */
  buildXdr: () => Promise<string>;
}

export interface CreateMarketIntentDeps {
  /** Injectable for tests; defaults to Horizon `loadAccount`. */
  loadAccount?: (address: string) => Promise<Account>;
  /** Injectable for tests; defaults to `NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID`. */
  contractId?: string;
}

export function getCreateMarketContractId(): string {
  // Read the direct reference as well as the validated `env` object: Next.js
  // only statically inlines `process.env.NEXT_PUBLIC_*` member access into the
  // client bundle, and lib/env.ts uses dynamic bracket access.
  const contractId =
    process.env.NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID ||
    env.NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID;
  if (!contractId) {
    throw new Error(
      "Market creation is not configured. Set NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID to the predictify contract address.",
    );
  }
  return contractId;
}

export function encodeCreateMarketArgs(
  draft: ValidatedMarketDraft,
  walletAddress: string,
): xdr.ScVal[] {
  return [
    new Address(walletAddress).toScVal(),
    nativeToScVal(draft.title, { type: "string" }),
    nativeToScVal(draft.description, { type: "string" }),
    nativeToScVal(draft.category, { type: "string" }),
    nativeToScVal(BigInt(Math.floor(draft.deadline.getTime() / 1000)), {
      type: "u64",
    }),
    xdr.ScVal.scvVec(
      draft.outcomes.map((outcome) =>
        nativeToScVal(outcome.text, { type: "string" }),
      ),
    ),
    nativeToScVal(draft.isPublic, { type: "bool" }),
    nativeToScVal(draft.featuredEvent, { type: "bool" }),
  ];
}

export function buildCreateMarketTransaction(
  draft: ValidatedMarketDraft,
  walletAddress: string,
  sourceAccount: Account,
  contractId: string,
): ReturnType<TransactionBuilder["build"]> {
  const contract = new Contract(contractId);
  const operation = contract.call(
    CREATE_MARKET_METHOD,
    ...encodeCreateMarketArgs(draft, walletAddress),
  );

  return new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(120)
    .build();
}

async function defaultLoadAccount(address: string): Promise<Account> {
  const server = new Horizon.Server(getHorizonUrl());
  const account = await server.loadAccount(address);
  return new Account(account.account_id, account.sequenceNumber());
}

/**
 * Derives the deterministic intent key for a draft.
 *
 * The key covers only on-chain fields, so the same draft always maps to the
 * same stored intent for a given wallet. Probabilities are display-only.
 */
export async function computeCreateMarketIntentKey(
  draft: ValidatedMarketDraft,
  walletAddress: string,
): Promise<{ key: string; draftHash: string }> {
  const draftHash = await computeXdrHash(canonicalizeMarketDraft(draft));
  return {
    key: `${walletAddress}:${CREATE_MARKET_METHOD}:${draftHash}`,
    draftHash,
  };
}

/**
 * Prepare a create_market intent for `useTransaction`.
 *
 * If a built intent already exists for this draft and wallet, its XDR is
 * reused instead of rebuilding and re-encoding it. That makes resubmitting
 * after a failure idempotent and lets `useTransaction` detect an existing
 * submission rather than signing a second market creation.
 */
export async function buildCreateMarketIntent(
  draft: ValidatedMarketDraft,
  walletAddress: string,
  deps: CreateMarketIntentDeps = {},
): Promise<CreateMarketIntent> {
  const { key, draftHash } = await computeCreateMarketIntentKey(
    draft,
    walletAddress,
  );

  const buildXdr = async (): Promise<string> => {
    const existing = getIntent(key);
    if (existing?.builtXdr && existing.status !== "failed") {
      return existing.builtXdr;
    }

    const contractId = deps.contractId ?? getCreateMarketContractId();
    const loadAccount = deps.loadAccount ?? defaultLoadAccount;
    const sourceAccount = await loadAccount(walletAddress);
    const transaction = buildCreateMarketTransaction(
      draft,
      walletAddress,
      sourceAccount,
      contractId,
    );
    const builtXdr = transaction.toXDR();

    upsertIntent({
      key,
      walletAddress,
      xdrHash: await computeXdrHash(builtXdr),
      status: "built",
      builtXdr,
    });

    return builtXdr;
  };

  return { key, draftHash, buildXdr };
}
