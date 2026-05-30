/**
 * SEP-41 Token Client
 *
 * Provides a per-stream token client that mirrors the Soroban contract pattern:
 *
 *   token::TokenClient::new(&env, &stream.token)
 *
 * Every money-movement operation (payout, refund, balance query) MUST obtain
 * its client via `getTokenClientForStream(stream)` — never by constructing a
 * client with a hardcoded asset.  This guarantees that two concurrent streams
 * using different tokens keep fully isolated escrow balances.
 *
 * ## Decimal handling
 * All amounts are expressed as **i128 raw units** (stroops for XLM, the
 * smallest indivisible unit for any SEP-41 token).  No per-decimal conversion
 * is performed here; callers are responsible for applying the correct exponent
 * when displaying values to end-users.
 *
 * ## Production vs. mock
 * In production this module would wrap the Stellar SDK / Soroban RPC client.
 * The current implementation is a typed mock that satisfies the interface so
 * the rest of the application can be built and tested against it.
 */

import type { Stream } from "@/app/types/openapi";
import { parseAssetString, type StellarAsset } from "./assets";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Result of a token transfer (payout or refund). */
export interface TokenTransferResult {
  /** Whether the transfer succeeded. */
  success: boolean;
  /** On-chain transaction hash (real in production, mocked in dev). */
  txHash: string;
  /** The token that was transferred. */
  token: string;
  /** Raw i128 amount transferred. */
  amount: bigint;
  /** ISO-8601 timestamp of the transfer. */
  settledAt: string;
}

/** Result of a balance query. */
export interface TokenBalanceResult {
  /** Raw i128 balance in the stream's escrow account. */
  balance: bigint;
  /** The token this balance is denominated in. */
  token: string;
}

/**
 * SEP-41 token client interface.
 *
 * Each instance is bound to a single token address and MUST NOT be reused
 * across streams that use different tokens.
 */
export interface Sep41TokenClient {
  /** The normalised token address this client is bound to. */
  readonly tokenAddress: string;
  /** The parsed Stellar asset descriptor. */
  readonly asset: StellarAsset;

  /**
   * Transfer `amount` raw units from the stream escrow to `recipientAddress`.
   * Used for payouts and withdrawals.
   */
  transfer(recipientAddress: string, amount: bigint, streamId: string): Promise<TokenTransferResult>;

  /**
   * Refund `amount` raw units from the stream escrow back to `senderAddress`.
   * Used for cancellations.
   */
  refund(senderAddress: string, amount: bigint, streamId: string): Promise<TokenTransferResult>;

  /**
   * Query the current escrow balance for `streamId`.
   */
  escrowBalance(streamId: string): Promise<TokenBalanceResult>;
}

// ── Mock implementation ───────────────────────────────────────────────────────

/**
 * Mock SEP-41 token client.
 *
 * In production, replace the body of each method with the corresponding
 * Stellar SDK / Soroban RPC call, keeping the interface identical.
 */
class MockSep41TokenClient implements Sep41TokenClient {
  readonly tokenAddress: string;
  readonly asset: StellarAsset;

  constructor(tokenAddress: string) {
    this.tokenAddress = tokenAddress;
    this.asset = parseAssetString(tokenAddress);
  }

  async transfer(
    recipientAddress: string,
    amount: bigint,
    streamId: string
  ): Promise<TokenTransferResult> {
    // TODO(production): invoke Soroban contract `transfer` on this.tokenAddress
    const txHash = `mock-transfer-${streamId}-${crypto.randomUUID().slice(0, 8)}`;
    return {
      success: true,
      txHash,
      token: this.tokenAddress,
      amount,
      settledAt: new Date().toISOString(),
    };
  }

  async refund(
    senderAddress: string,
    amount: bigint,
    streamId: string
  ): Promise<TokenTransferResult> {
    // TODO(production): invoke Soroban contract `transfer` back to sender
    const txHash = `mock-refund-${streamId}-${crypto.randomUUID().slice(0, 8)}`;
    return {
      success: true,
      txHash,
      token: this.tokenAddress,
      amount,
      settledAt: new Date().toISOString(),
    };
  }

  async escrowBalance(streamId: string): Promise<TokenBalanceResult> {
    // TODO(production): query Soroban contract storage for this stream's escrow
    return {
      balance: 0n,
      token: this.tokenAddress,
    };
  }
}

// ── Client factory ────────────────────────────────────────────────────────────

/**
 * Per-stream token client cache.
 *
 * Keyed by normalised token address.  Clients are stateless in the mock
 * implementation so caching is safe; in production the cache should be
 * invalidated on network changes.
 */
const _clientCache = new Map<string, Sep41TokenClient>();

/**
 * Obtain a SEP-41 token client bound to the given token address.
 *
 * This is the low-level factory.  Prefer `getTokenClientForStream` in
 * application code so the token is always sourced from the stream record.
 *
 * @param tokenAddress  Normalised token string ("XLM" or "CODE:ISSUER").
 */
export function getTokenClient(tokenAddress: string): Sep41TokenClient {
  const cached = _clientCache.get(tokenAddress);
  if (cached) return cached;

  const client = new MockSep41TokenClient(tokenAddress);
  _clientCache.set(tokenAddress, client);
  return client;
}

/**
 * Obtain the SEP-41 token client for a specific stream.
 *
 * **Always use this function in money-movement code** — it guarantees the
 * client is constructed from `stream.token` and never from a hardcoded asset.
 *
 * Equivalent to the Soroban pattern:
 *   `token::TokenClient::new(&env, &stream.token)`
 *
 * @param stream  The stream record whose `token` field drives the client.
 */
export function getTokenClientForStream(stream: Pick<Stream, "token">): Sep41TokenClient {
  return getTokenClient(stream.token);
}

/**
 * Clear the client cache.  Intended for use in tests only.
 */
export function _clearTokenClientCacheForTesting(): void {
  _clientCache.clear();
}
