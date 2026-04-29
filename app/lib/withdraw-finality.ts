import type { Stream, WithdrawalStatus } from "@/app/types/openapi";

const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const FINALITY_WINDOW_MS = 90_000;
const MAX_ATTEMPTS = 5;
const PAGE_LIMIT = 20;
const PAGE_SCAN_LIMIT = 3;

type HorizonRecord = {
  id?: string;
  hash?: string;
  successful?: boolean;
  created_at?: string;
  memo?: string | null;
};

type HorizonPage = {
  _embedded?: { records?: HorizonRecord[] };
  _links?: { next?: { href?: string } };
};

export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

function toAttempts(value: number | undefined): number {
  if (!value || value < 0) return 0;
  return value;
}

function getAgeMs(requestedAt: string, now: Date): number {
  const started = Date.parse(requestedAt);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, now.getTime() - started);
}

function getNextCursorFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const cursor = new URL(href).searchParams.get("cursor");
  return cursor ?? undefined;
}

export async function findTransactionWithPagination(
  accountId: string,
  txHash: string,
  cursor: string | undefined,
  fetcher: FetchLike,
): Promise<{ matchedHash?: string; nextCursor?: string }> {
  let currentCursor = cursor;
  for (let page = 0; page < PAGE_SCAN_LIMIT; page += 1) {
    const query = new URL(`${HORIZON_URL}/accounts/${accountId}/transactions`);
    query.searchParams.set("order", "desc");
    query.searchParams.set("limit", String(PAGE_LIMIT));
    if (currentCursor) {
      query.searchParams.set("cursor", currentCursor);
    }
    const response = await fetcher(query.toString(), { cache: "no-store" });
    if (!response.ok) {
      break;
    }
    const pageData = (await response.json()) as HorizonPage;
    const records = pageData._embedded?.records ?? [];
    const matched = records.find((record) => record.hash === txHash && record.successful !== false);
    if (matched?.hash) {
      return { matchedHash: matched.hash, nextCursor: currentCursor };
    }
    const nextCursor = getNextCursorFromHref(pageData._links?.next?.href);
    if (!nextCursor || nextCursor === currentCursor) {
      return { nextCursor: currentCursor };
    }
    currentCursor = nextCursor;
  }
  return { nextCursor: currentCursor };
}

export async function evaluateWithdrawalState(
  stream: Stream,
  now: Date,
  fetcher: FetchLike = fetch,
): Promise<{ stream: Stream; alert: boolean }> {
  const existing = stream.withdrawal;
  const requestedAt = existing?.requestedAt ?? now.toISOString();
  const attempts = toAttempts(existing?.attempts) + 1;
  const settlementTxHash = stream.settlementTxHash ?? existing?.settlementTxHash;
  const next: WithdrawalStatus = {
    state: "pending",
    requestedAt,
    lastCheckedAt: now.toISOString(),
    attempts,
    settlementTxHash,
    horizonCursor: existing?.horizonCursor,
  };

  if (!settlementTxHash) {
    next.state = "failed";
    next.failureCode = "SETTLEMENT_TX_MISSING";
    stream.withdrawal = next;
    stream.updatedAt = now.toISOString();
    return { stream, alert: true };
  }

  const { matchedHash, nextCursor } = await findTransactionWithPagination(
    stream.id,
    settlementTxHash,
    existing?.horizonCursor,
    fetcher,
  );
  if (nextCursor) {
    next.horizonCursor = nextCursor;
  }
  if (matchedHash) {
    next.state = "succeeded";
    next.confirmedTxHash = matchedHash;
    stream.withdrawal = next;
    stream.status = "withdrawn";
    stream.nextAction = undefined;
    stream.updatedAt = now.toISOString();
    return { stream, alert: false };
  }

  const timedOut = getAgeMs(requestedAt, now) >= FINALITY_WINDOW_MS;
  if (timedOut || attempts >= MAX_ATTEMPTS) {
    next.state = "failed";
    next.failureCode = "FINALITY_TIMEOUT";
    stream.withdrawal = next;
    stream.nextAction = "withdraw";
    stream.updatedAt = now.toISOString();
    return { stream, alert: true };
  }

  stream.withdrawal = next;
  stream.nextAction = "withdraw";
  stream.updatedAt = now.toISOString();
  return { stream, alert: false };
}
