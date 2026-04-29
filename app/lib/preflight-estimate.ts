/**
 * Preflight reserve and fee estimation for stream creation.
 * Returns min XLM balance and estimated fees for proposed streams.
 */

import { Amount, STROOPS_SCALE, type ValidationResult, type SupportedAsset } from "./amount";

export type PreflightEstimate = {
  min_balance_xlm: string;
  estimated_fees: string;
  breakdown: {
    base_reserve: string;
    trustline_reserve?: string;
    escrow_reserve?: string;
    base_fee: string;
    escrow_fee?: string;
  };
};

// Stellar network constants (stroops)
const BASE_RESERVE_STROOPS = 5_000_000n; // 0.5 XLM per entry
const BASE_FEE_STROOPS = 100n; // 0.00001 XLM per operation
const TRUSTLINE_ENTRIES = 1n; // 1 trustline entry if non-XLM asset
const ESCROW_ENTRIES = 1n; // 1 escrow account entry (future Soroban)
const ESCROW_OPS = 2n; // 2 ops: create escrow + fund

/**
 * Estimates minimum XLM balance and fees for a stream.
 * @param asset - Asset for the stream (XLM or USDC)
 * @param useEscrow - Whether to include escrow overhead (future Soroban)
 */
export function estimateStreamCost(
  asset: SupportedAsset,
  useEscrow: boolean = false,
): ValidationResult<PreflightEstimate> {
  // Base reserve: 2 entries (account + stream metadata)
  let reserveStroops = BASE_RESERVE_STROOPS * 2n;
  
  // Trustline reserve for non-XLM assets
  const trustlineReserve = asset !== "XLM" ? BASE_RESERVE_STROOPS * TRUSTLINE_ENTRIES : 0n;
  reserveStroops += trustlineReserve;

  // Escrow reserve (future)
  const escrowReserve = useEscrow ? BASE_RESERVE_STROOPS * ESCROW_ENTRIES : 0n;
  reserveStroops += escrowReserve;

  // Base fee: 1 op for stream creation
  let feeStroops = BASE_FEE_STROOPS;

  // Escrow fee (future)
  const escrowFee = useEscrow ? BASE_FEE_STROOPS * ESCROW_OPS : 0n;
  feeStroops += escrowFee;

  const minBalanceResult = Amount.fromStroops(reserveStroops, "XLM");
  const estimatedFeesResult = Amount.fromStroops(feeStroops, "XLM");

  if (!minBalanceResult.ok) return minBalanceResult;
  if (!estimatedFeesResult.ok) return estimatedFeesResult;

  const baseReserveResult = Amount.fromStroops(BASE_RESERVE_STROOPS * 2n, "XLM");
  const baseFeeResult = Amount.fromStroops(BASE_FEE_STROOPS, "XLM");

  if (!baseReserveResult.ok) return baseReserveResult;
  if (!baseFeeResult.ok) return baseFeeResult;

  const breakdown: PreflightEstimate["breakdown"] = {
    base_reserve: baseReserveResult.value.toDecimalString(),
    base_fee: baseFeeResult.value.toDecimalString(),
  };

  if (trustlineReserve > 0n) {
    const trustlineReserveResult = Amount.fromStroops(trustlineReserve, "XLM");
    if (!trustlineReserveResult.ok) return trustlineReserveResult;
    breakdown.trustline_reserve = trustlineReserveResult.value.toDecimalString();
  }

  if (escrowReserve > 0n) {
    const escrowReserveResult = Amount.fromStroops(escrowReserve, "XLM");
    if (!escrowReserveResult.ok) return escrowReserveResult;
    breakdown.escrow_reserve = escrowReserveResult.value.toDecimalString();
  }

  if (escrowFee > 0n) {
    const escrowFeeResult = Amount.fromStroops(escrowFee, "XLM");
    if (!escrowFeeResult.ok) return escrowFeeResult;
    breakdown.escrow_fee = escrowFeeResult.value.toDecimalString();
  }

  return {
    ok: true,
    value: {
      min_balance_xlm: minBalanceResult.value.toDecimalString(),
      estimated_fees: estimatedFeesResult.value.toDecimalString(),
      breakdown,
    },
  };
}
