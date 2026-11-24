import {
  computeXdrHash,
  type IntentStatus,
} from "@/lib/transaction/intent";
import type { CreatorAction } from "@/lib/creator";

export interface CreatorIntent {
  key: string;
  walletAddress: string;
  intentHash: string;
  status: Extract<IntentStatus, "built">;
  action: CreatorAction;
  marketId: string;
}

export async function createCreatorIntent(
  action: CreatorAction,
  marketId: string,
  walletAddress: string
): Promise<CreatorIntent> {
  if (!marketId.trim() || !walletAddress.trim()) {
    throw new Error("A market and connected wallet are required.");
  }

  const intentDescription = JSON.stringify({ action, marketId, walletAddress });
  const intentHash = await computeXdrHash(intentDescription);

  return {
    key: `${walletAddress}:${intentHash}`,
    walletAddress,
    intentHash,
    status: "built",
    action,
    marketId,
  };
}

export function createCancelMarketIntent(marketId: string, walletAddress: string) {
  return createCreatorIntent("cancel_market", marketId, walletAddress);
}

export function createRequestResolutionIntent(
  marketId: string,
  walletAddress: string
) {
  return createCreatorIntent("request_resolution", marketId, walletAddress);
}

export function buildCreatorIntentXdr(_intent: CreatorIntent): string {
  throw new Error(
    "Creator market actions are unavailable because the deployed contract does not expose cancel_market or request_resolution."
  );
}
