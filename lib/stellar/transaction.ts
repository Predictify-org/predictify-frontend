import { config } from '@/lib/config';

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

function normalizeErrorMessage(payload: any, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.detail === 'string' && payload.detail.length > 0) {
    return payload.detail;
  }

  if (payload.extras?.result_codes?.transaction) {
    return payload.extras.result_codes.transaction;
  }

  return fallback;
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
    return {
      success: false,
      status: 'submitFailed',
      error: (error as Error)?.message || 'Transaction submission failed',
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
      return {
        success: false,
        status: 'confirmationFailed',
        error: (error as Error)?.message || 'Transaction confirmation failed',
      };
    }
  }

  return {
    success: false,
    status: 'confirmationTimeout',
    error: `Transaction did not confirm within ${timeoutMs / 1000} seconds`,
  };
}
