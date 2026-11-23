import { z } from "zod";
import { config } from "@/lib/config";
import { getHorizonUrl } from "./transaction";

export type MarketActivityType = "bet" | "claim" | "dispute";

export interface MarketActivityEvent {
  id: string;
  type: MarketActivityType;
  address: string;
  amount?: string;
  outcome?: string;
  ledgerClosedAt: string;
  txHash: string;
}

export interface FetchMarketActivityOptions {
  marketId: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
  fetcher?: MarketActivityFetcher;
}

export interface MarketActivityPage {
  events: MarketActivityEvent[];
  nextCursor?: string | null;
}

export type MarketActivityFetcher = (
  options: FetchMarketActivityOptions
) => Promise<MarketActivityPage>;

export const marketActivityEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["bet", "claim", "dispute"]),
  address: z.string().min(1),
  amount: z.string().optional(),
  outcome: z.string().optional(),
  ledgerClosedAt: z.string().min(1),
  txHash: z.string().min(1),
});

export const rawContractEventSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().optional(),
    topic: z.array(z.any()).optional(),
    topics: z.array(z.any()).optional(),
    value: z.any().optional(),
    data: z.any().optional(),
    address: z.string().optional(),
    user: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    outcome: z.string().optional(),
    ledgerClosedAt: z.string().optional(),
    txHash: z.string().optional(),
    transactionHash: z.string().optional(),
  })
  .passthrough();

/**
 * Parses a single contract event payload and normalizes it into MarketActivityEvent.
 * If the event is malformed or its type is unknown / unsupported, returns null without throwing.
 */
export function parseContractEvent(raw: unknown): MarketActivityEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  try {
    const parsedRaw = rawContractEventSchema.safeParse(raw);
    if (!parsedRaw.success) {
      return null;
    }

    const item = parsedRaw.data;

    // Determine type: check explicit field or topics/topic array
    let detectedType: string | undefined = item.type?.toLowerCase();

    const topics: unknown[] = Array.isArray(item.topics)
      ? item.topics
      : Array.isArray(item.topic)
      ? item.topic
      : [];

    if (!detectedType || !["bet", "claim", "dispute"].includes(detectedType)) {
      for (const t of topics) {
        const topicStr = String(t).toLowerCase();
        if (topicStr.includes("bet")) {
          detectedType = "bet";
          break;
        } else if (topicStr.includes("claim") || topicStr.includes("payout")) {
          detectedType = "claim";
          break;
        } else if (topicStr.includes("dispute")) {
          detectedType = "dispute";
          break;
        }
      }
    }

    if (!detectedType || !["bet", "claim", "dispute"].includes(detectedType)) {
      return null;
    }

    // Extract address
    let address = item.address || item.user;
    if (!address && topics.length > 1) {
      const candidate = String(topics[1]);
      if (candidate.startsWith("G") || candidate.startsWith("C") || candidate.length >= 10) {
        address = candidate;
      }
    }
    if (!address && typeof item.data === "object" && item.data !== null) {
      const dataObj = item.data as Record<string, unknown>;
      address = (dataObj.address || dataObj.user || dataObj.caller) as string;
    }
    if (!address && typeof item.value === "object" && item.value !== null) {
      const valObj = item.value as Record<string, unknown>;
      address = (valObj.address || valObj.user || valObj.caller) as string;
    }

    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return null;
    }

    // Extract amount
    let amount: string | undefined;
    if (item.amount !== undefined && item.amount !== null) {
      amount = String(item.amount);
    } else if (typeof item.data === "object" && item.data !== null) {
      const dataObj = item.data as Record<string, unknown>;
      if (dataObj.amount !== undefined && dataObj.amount !== null) {
        amount = String(dataObj.amount);
      }
    } else if (typeof item.value === "object" && item.value !== null) {
      const valObj = item.value as Record<string, unknown>;
      if (valObj.amount !== undefined && valObj.amount !== null) {
        amount = String(valObj.amount);
      }
    }

    // Extract outcome
    let outcome = item.outcome;
    if (!outcome && typeof item.data === "object" && item.data !== null) {
      const dataObj = item.data as Record<string, unknown>;
      if (dataObj.outcome !== undefined) {
        outcome = String(dataObj.outcome);
      }
    } else if (!outcome && typeof item.value === "object" && item.value !== null) {
      const valObj = item.value as Record<string, unknown>;
      if (valObj.outcome !== undefined) {
        outcome = String(valObj.outcome);
      }
    }

    // Extract timestamp
    const ledgerClosedAt =
      item.ledgerClosedAt ||
      (typeof item.data === "object" && item.data !== null
        ? String((item.data as Record<string, unknown>).ledgerClosedAt || "")
        : "") ||
      new Date().toISOString();

    // Extract txHash
    const txHash =
      item.txHash ||
      item.transactionHash ||
      (typeof item.data === "object" && item.data !== null
        ? String((item.data as Record<string, unknown>).txHash || "")
        : "") ||
      `tx-${item.id}`;

    const normalized: MarketActivityEvent = {
      id: item.id,
      type: detectedType as MarketActivityType,
      address: address.trim(),
      amount: amount?.trim(),
      outcome: outcome?.trim(),
      ledgerClosedAt,
      txHash,
    };

    const validated = marketActivityEventSchema.safeParse(normalized);
    if (!validated.success) {
      return null;
    }

    return validated.data;
  } catch {
    return null;
  }
}

/**
 * Parses an array of contract event records, safely dropping unknown or malformed items.
 */
export function parseContractEvents(rawEvents: unknown[]): MarketActivityEvent[] {
  if (!Array.isArray(rawEvents)) return [];
  const results: MarketActivityEvent[] = [];
  for (const raw of rawEvents) {
    const parsed = parseContractEvent(raw);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
}

/**
 * Fetches on-chain activity events for a specific market with cursor-based pagination.
 * Supports custom `fetcher` parameter for tests and modular data sources.
 */
export async function fetchMarketActivity(
  options: FetchMarketActivityOptions
): Promise<MarketActivityPage> {
  const { marketId, cursor, limit = 20, signal, fetcher } = options;

  if (fetcher) {
    return fetcher(options);
  }

  const endpoint = new URL(
    `${config.api.url.replace(/\/+$/, "")}/markets/${encodeURIComponent(
      marketId
    )}/activity`
  );
  if (cursor) endpoint.searchParams.set("cursor", cursor);
  if (limit) endpoint.searchParams.set("limit", String(limit));

  const response = await fetch(endpoint.toString(), {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market activity: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const rawList = Array.isArray(json)
    ? json
    : Array.isArray(json?.events)
    ? json.events
    : Array.isArray(json?.items)
    ? json.items
    : [];

  const events = parseContractEvents(rawList);
  const nextCursor =
    typeof json?.nextCursor === "string"
      ? json.nextCursor
      : typeof json?.cursor === "string"
      ? json.cursor
      : null;

  return {
    events,
    nextCursor,
  };
}
