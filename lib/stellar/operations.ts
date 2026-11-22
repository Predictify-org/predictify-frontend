import { z } from 'zod';
import { getHorizonUrl } from '@/lib/stellar/transaction';
import type { Transaction } from '@/lib/types';

export const DEFAULT_OPERATIONS_LIMIT = 20;

export interface NormalizedOperation extends Transaction {
  id: string;
  pagingToken: string;
  rawType: string;
}

export interface FetchAccountOperationsParams {
  address: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}

export interface FetchAccountOperationsResult {
  records: NormalizedOperation[];
  nextCursor: string | null;
}

const horizonOperationRecordSchema = z
  .object({
    id: z.string().min(1),
    paging_token: z.string().min(1),
    type: z.string().min(1),
    created_at: z.string().min(1),
    transaction_hash: z.string().min(1),
    transaction_successful: z.boolean().optional(),
    source_account: z.string().optional(),
    // payment / path_payment fields
    from: z.string().optional(),
    to: z.string().optional(),
    amount: z.string().optional(),
    asset_type: z.string().optional(),
    asset_code: z.string().optional(),
    // create_account fields
    account: z.string().optional(),
    funder: z.string().optional(),
    starting_balance: z.string().optional(),
    // invoke_host_function fields
    function: z.string().optional(),
  })
  .passthrough();

type HorizonOperationRecord = z.infer<typeof horizonOperationRecordSchema>;

const horizonOperationsEnvelopeSchema = z.object({
  _embedded: z.object({
    records: z.array(z.unknown()),
  }),
  _links: z
    .object({
      next: z
        .object({
          href: z.string(),
        })
        .optional(),
    })
    .optional(),
});

function resolveCurrency(record: HorizonOperationRecord): Transaction['currency'] {
  if (record.asset_type === 'native' || !record.asset_code) {
    return 'XLM';
  }
  return record.asset_code.toUpperCase() === 'USDC' ? 'USDC' : 'XLM';
}

function parseNumericAmount(raw?: string): number {
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(
  numericAmount: number,
  currency: Transaction['currency'],
  sign: '+' | '-' | ''
): string {
  if (numericAmount === 0 && sign === '') {
    return `0.00 ${currency}`;
  }
  return `${sign}${numericAmount.toFixed(2)} ${currency}`;
}

function shortenAddress(addr?: string): string {
  if (!addr) return 'unknown';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function normalizeHorizonRecord(
  record: HorizonOperationRecord,
  accountAddress: string
): NormalizedOperation {
  const status: Transaction['status'] =
    record.transaction_successful === false ? 'pending' : 'completed';
  const currency = resolveCurrency(record);

  if (
    record.type === 'payment' ||
    record.type === 'path_payment_strict_receive' ||
    record.type === 'path_payment_strict_send'
  ) {
    const isIncoming = record.to === accountAddress;
    const numericAmount = parseNumericAmount(record.amount);
    const counterparty = isIncoming ? record.from : record.to;

    return {
      id: record.id,
      pagingToken: record.paging_token,
      rawType: record.type,
      date: record.created_at,
      hash: record.transaction_hash,
      type: isIncoming ? 'deposit' : 'withdraw',
      amount: formatAmount(numericAmount, currency, isIncoming ? '+' : '-'),
      numericAmount,
      currency,
      status,
      icon: isIncoming ? 'down' : 'up',
      amountColor: isIncoming ? 'text-green-600' : 'text-red-600',
      description: isIncoming
        ? `Received from ${shortenAddress(counterparty)}`
        : `Sent to ${shortenAddress(counterparty)}`,
    };
  }

  if (record.type === 'create_account') {
    const isIncoming = record.account === accountAddress;
    const numericAmount = parseNumericAmount(record.starting_balance);
    const counterparty = isIncoming ? record.funder : record.account;

    return {
      id: record.id,
      pagingToken: record.paging_token,
      rawType: record.type,
      date: record.created_at,
      hash: record.transaction_hash,
      type: isIncoming ? 'deposit' : 'withdraw',
      amount: formatAmount(numericAmount, 'XLM', isIncoming ? '+' : '-'),
      numericAmount,
      currency: 'XLM',
      status,
      icon: isIncoming ? 'down' : 'up',
      amountColor: isIncoming ? 'text-green-600' : 'text-red-600',
      description: isIncoming
        ? `Account funded by ${shortenAddress(counterparty)}`
        : `Created account ${shortenAddress(counterparty)}`,
    };
  }

  if (record.type === 'invoke_host_function') {
    const fnName = (record.function ?? '').toLowerCase();
    let type: Transaction['type'] = 'bet';
    let icon: Transaction['icon'] = 'refresh';
    let amountColor = 'text-gray-700';

    if (fnName.includes('claim') || fnName.includes('win') || fnName.includes('payout')) {
      type = 'win';
      icon = 'down';
      amountColor = 'text-green-600';
    } else if (fnName.includes('refund')) {
      type = 'refund';
      icon = 'refresh';
      amountColor = 'text-blue-600';
    }

    const numericAmount = parseNumericAmount(record.amount);

    return {
      id: record.id,
      pagingToken: record.paging_token,
      rawType: record.type,
      date: record.created_at,
      hash: record.transaction_hash,
      type,
      amount: numericAmount > 0 ? formatAmount(numericAmount, currency, '') : '—',
      numericAmount,
      currency,
      status,
      icon,
      amountColor,
      description: record.function
        ? `Contract call: ${record.function}`
        : 'Soroban contract invocation',
    };
  }

  const numericAmount = parseNumericAmount(record.amount);
  const readableType = record.type.replace(/_/g, ' ');

  return {
    id: record.id,
    pagingToken: record.paging_token,
    rawType: record.type,
    date: record.created_at,
    hash: record.transaction_hash,
    type: 'bet',
    amount: numericAmount > 0 ? formatAmount(numericAmount, currency, '') : '—',
    numericAmount,
    currency,
    status,
    icon: 'refresh',
    amountColor: 'text-gray-700',
    description: `Stellar operation: ${readableType}`,
  };
}

function extractNextCursor(
  nextHref: string | undefined,
  currentCursor?: string | null
): string | null {
  if (!nextHref) return null;
  try {
    const url = new URL(nextHref);
    const next = url.searchParams.get('cursor');
    if (!next || next === currentCursor) {
      return null;
    }
    return next;
  } catch {
    return null;
  }
}

export async function fetchAccountOperations({
  address,
  cursor,
  limit = DEFAULT_OPERATIONS_LIMIT,
  signal,
}: FetchAccountOperationsParams): Promise<FetchAccountOperationsResult> {
  const baseUrl = getHorizonUrl();
  const params = new URLSearchParams({
    order: 'desc',
    limit: String(limit),
  });
  if (cursor) {
    params.set('cursor', cursor);
  }

  const endpoint = `${baseUrl}/accounts/${encodeURIComponent(address)}/operations?${params.toString()}`;
  const response = await fetch(endpoint, { signal });

  if (response.status === 404) {
    return { records: [], nextCursor: null };
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded while loading transactions. Please try again shortly.');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch account operations (${response.status})`);
  }

  const json: unknown = await response.json();
  const envelopeResult = horizonOperationsEnvelopeSchema.safeParse(json);

  if (!envelopeResult.success) {
    throw new Error('Received an invalid response from Stellar Horizon.');
  }

  const rawRecords = envelopeResult.data._embedded.records;
  const normalizedRecords: NormalizedOperation[] = [];

  for (const item of rawRecords) {
    const parsed = horizonOperationRecordSchema.safeParse(item);
    if (parsed.success) {
      normalizedRecords.push(normalizeHorizonRecord(parsed.data, address));
    }
  }

  // If the page returned no records (or all records were malformed), do not advance pagination.
  if (normalizedRecords.length === 0) {
    return { records: [], nextCursor: null };
  }

  const nextCursor = extractNextCursor(envelopeResult.data._links?.next?.href, cursor);

  return {
    records: normalizedRecords,
    nextCursor,
  };
}
