import { config } from '@/lib/config';
import {
  normalizeContractError,
  type HorizonResultCodes,
  type NormalizedError,
} from './contract-error-normalizer';

export type StellarNetwork = 'testnet' | 'mainnet';

const HORIZON_BASE_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
};

export interface TransactionSuccess {
  success: true;
  hash: string;
}

export interface TransactionFailure {
  success: false;
  error: string;
  code?: string;
  status: 'submitFailed' | 'confirmationFailed' | 'confirmationTimeout';
}

export type TransactionResult = TransactionSuccess | TransactionFailure;

export function getStellarNetwork(): StellarNetwork {
  return config.stellar.network;
}

export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASES[getStellarNetwork()];
}

export function getHorizonUrl(): string {
  return HORIZON_BASE_URLS[getStellarNetwork()];
}

/**
 * Normalize a Horizon error payload into a user-safe description string.
 *
 * Routes through ContractErrorNormalizer so Soroban/contract-specific
 * result codes are translated to actionable, user-facing copy.
 *
 * @internal Use normalizeTransactionError for structured output with code/isRetryable.
 */
function normalizeErrorMessage(
  payload: { detail?: string; extras?: { result_codes?: HorizonResultCodes } } | null,
  fallback: string,
): string {
  if (!payload) {
    return fallback;
  }

  const resultCodes = payload?.extras?.result_codes;

  // If result_codes are present, run through the full normalizer for
  // actionable, user-safe copy.
  if (resultCodes?.transaction || resultCodes?.operations?.length) {
    const normalized = normalizeContractError(
      resultCodes.transaction ?? undefined,
      resultCodes,
    );
    return normalized.description;
  }

  if (typeof payload.detail === 'string' && payload.detail.length > 0) {
    // detail may contain internal info — run through normalizer
    const normalized = normalizeContractError(payload.detail);
    // Only use the normalizer result for known (non-unknown) error patterns
    if (normalized.code !== 'UNKNOWN') {
      return normalized.description;
    }
    // For unknown patterns in detail, return a safe generic message
    return fallback;
  }

  return fallback;
}

/**
 * Returns a structured NormalizedError for a Horizon payload.
 * Prefer this over normalizeErrorMessage when callers need code/isRetryable.
 *
 * @param payload  Raw Horizon JSON error payload, or null.
 * @param fallback  Fallback description when no recognized code is found.
 */
export function normalizeTransactionError(
  payload: { detail?: string; extras?: { result_codes?: HorizonResultCodes } } | null,
  fallback: string,
): NormalizedError {
  if (!payload) {
    return normalizeContractError(undefined);
  }
  const resultCodes = payload?.extras?.result_codes;
  if (resultCodes?.transaction || resultCodes?.operations?.length) {
    return normalizeContractError(resultCodes.transaction ?? undefined, resultCodes);
  }
  if (typeof payload.detail === 'string' && payload.detail.length > 0) {
    return normalizeContractError(payload.detail);
  }
  return normalizeContractError(fallback);
}

export async function submitTransaction(
  signedXdr: string,
): Promise<TransactionResult> {
  const endpoint = `${getHorizonUrl()}/transactions`;
  const body = new URLSearchParams({ tx: signedXdr });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return {
        success: true,
        hash: payload?.hash ?? payload?.id ?? '',
      };
    }

    return {
      success: false,
      status: 'submitFailed',
      code: payload?.extras?.result_codes?.transaction,
      error: normalizeErrorMessage(
        payload,
        `Transaction submission failed (${response.status})`,
      ),
    };
  } catch (error: unknown) {
    const rawMsg = (error as Error)?.message || 'Transaction submission failed';
    return {
      success: false,
      status: 'submitFailed',
      error: normalizeContractError(rawMsg).description,
    };
  }
}

export interface PollForConfirmationOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function pollForConfirmation(
  hash: string,
  options: PollForConfirmationOptions = {},
): Promise<TransactionResult> {
  const intervalMs = options.intervalMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const endpoint = `${getHorizonUrl()}/transactions/${hash}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return { success: true, hash };
      }

      if (response.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      const payload = await response.json().catch(() => null);
      return {
        success: false,
        status: 'confirmationFailed',
        code: payload?.extras?.result_codes?.transaction,
        error: normalizeErrorMessage(
          payload,
          `Transaction confirmation failed (${response.status})`,
        ),
      };
    } catch (error: unknown) {
      const rawMsg = (error as Error)?.message || 'Transaction confirmation failed';
      return {
        success: false,
        status: 'confirmationFailed',
        error: normalizeContractError(rawMsg).description,
      };
    }
  }

  return {
    success: false,
    status: 'confirmationTimeout',
    error: `Transaction did not confirm within ${timeoutMs / 1000} seconds`,
  };
}
