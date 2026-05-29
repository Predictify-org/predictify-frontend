/**
 * Asset Engine for StreamPay
 * Handles XLM and Stellar custom assets (Trustlines).
 */

import { getConfig } from './config';

export interface StellarAsset {
  code: string;
  issuer?: string;
  isNative: boolean;
}

export const NATIVE_ASSET: StellarAsset = {
  code: 'XLM',
  isNative: true,
};

/**
 * Parses an asset string (e.g. "USDC:GABC...") or returns native.
 */
export function parseAssetString(assetStr: string): StellarAsset {
  if (!assetStr || assetStr.toUpperCase() === 'XLM' || assetStr.toLowerCase() === 'native') {
    return NATIVE_ASSET;
  }

  if (assetStr.includes(':')) {
    const [code, issuer] = assetStr.split(':');
    if (code && issuer && issuer.length === 56 && issuer.startsWith('G')) {
      return { code: code.toUpperCase(), issuer, isNative: false };
    }
  }

  throw new Error(`Invalid asset format: ${assetStr}. Expected XLM or CODE:ISSUER`);
}

/**
 * Fetches account balances from Horizon and checks for a specific trustline.
 * Horizon URL is now sourced from centralized config to prevent hardcoded URLs.
 */
export async function verifyTrustline(
  publicKey: string,
  asset: StellarAsset,
  horizonUrl?: string
): Promise<{ exists: boolean; error?: string }> {
  if (asset.isNative) return { exists: true };

  // Use provided horizonUrl or fall back to config
  const config = getConfig();
  const effectiveHorizonUrl = horizonUrl || config.network.horizonUrl;

  try {
    const response = await fetch(`${effectiveHorizonUrl}/accounts/${publicKey}`);
    
    if (response.status === 404) {
      return { exists: false, error: 'Recipient account does not exist on-chain.' };
    }

    if (!response.ok) {
      return { exists: false, error: `Horizon error: ${response.status}` };
    }

    const data = await response.json();
    const hasTrustline = data.balances.some(
      (b: any) => b.asset_code === asset.code && b.asset_issuer === asset.issuer
    );

    if (!hasTrustline) {
      return { exists: false, error: `Missing trustline for ${asset.code}.` };
    }

    return { exists: true };
  } catch (err: any) {
    return { exists: false, error: `Network error: ${err.message}` };
  }
}

/**
 * Validates if an asset can be used for a stream.
 */
export function validateAssetPair(sourceAsset: StellarAsset, destAsset: StellarAsset): boolean {
  // v1 limitation: source and destination must match unless a path payment is used
  // For now, we enforce same asset
  return (
    sourceAsset.isNative === destAsset.isNative &&
    sourceAsset.code === destAsset.code &&
    sourceAsset.issuer === destAsset.issuer
  );
}
