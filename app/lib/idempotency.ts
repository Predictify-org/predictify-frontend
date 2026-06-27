import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { logger } from "@/app/lib/logger";
import { IDEMPOTENCY_TTL_MS } from "@/app/lib/db";
import { db } from "@/app/lib/db";

export interface IdempotencyRecord {
  fingerprint: string;
  statusCode: number;
  body: unknown;
  createdAt: number;
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, record: IdempotencyRecord): Promise<void>;
}

// Helper to create a namespaced store backed by the existing persistence layer
export function createNamespacedStore(namespace: string): IdempotencyStore {
  const backing = db.idempotency as any;
  const prefix = `idempotency:${namespace}:`;

  return {
    async get(key: string) {
      try {
        const raw = backing.get(prefix + key);
        if (raw === undefined) return null;
        const entry = raw as any;
        if (typeof entry?.fingerprint !== "string" || typeof entry?.expiresAt !== "number") {
          backing.delete(prefix + key);
          return null;
        }
        if (entry.expiresAt < Date.now()) {
          backing.delete(prefix + key);
          return null;
        }
        return {
          fingerprint: entry.fingerprint,
          statusCode: entry.status,
          body: entry.body,
          createdAt: entry.expiresAt - IDEMPOTENCY_TTL_MS,
        } as IdempotencyRecord;
      } catch (err: any) {
        throw err;
      }
    },
    async set(key: string, record: IdempotencyRecord) {
      // Persist in the backing store with an expiresAt so memory/postgres adapters
      // can perform lazy eviction. For stores that support TTL at storage layer,
      // this file can be extended to use native EX/TTL commands.
      const now = Date.now();
      const entry = {
        fingerprint: record.fingerprint,
        expiresAt: now + IDEMPOTENCY_TTL_MS,
        status: record.statusCode,
        body: record.body,
      };
      backing.set(prefix + key, entry);
    },
  };
}

// Default route-scoped stores exported for callers to import.
export const settleStore = createNamespacedStore("settle");
export const withdrawStore = createNamespacedStore("withdraw");

// Validate idempotency key: printable ASCII, 1-255 characters.
// We disallow control characters and Unicode; spaces are not allowed to avoid
// ambiguity in transport and trimming behaviour.
const IDEMPOTENCY_KEY_RE = /^[\x21-\x7E]{1,255}$/;

function makeHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function withIdempotency(
  request: Request,
  routeId: string,
  store: IdempotencyStore,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = request.headers?.get?.("Idempotency-Key");

  if (!key) {
    return NextResponse.json({ error: "IdempotencyKeyRequired", message: "Idempotency-Key header is required for mutating operations" }, { status: 400 });
  }

  if (typeof key !== "string" || !IDEMPOTENCY_KEY_RE.test(key)) {
    return NextResponse.json({ error: "IdempotencyKeyInvalid", message: "Idempotency-Key is invalid" }, { status: 400 });
  }

  // Read and normalise the request body. Hash body separately to avoid creating
  // a fingerprint that leaks or scales poorly for large payloads.
  // The body is hashed first so the outer fingerprint becomes:
  //   SHA-256(idempotency_key + ":" + routeId + ":" + SHA-256(body_json))
  let bodyJson: unknown = null;
  try {
    const text = await request.text();
    bodyJson = text ? JSON.parse(text) : null;
  } catch {
    bodyJson = null;
  }

  const bodyHash = makeHash(JSON.stringify(bodyJson ?? null));
  const fingerprint = makeHash(`${key}:${routeId}:${bodyHash}`);

  // Try reading existing record. If the backing store fails, we log and
  // allow the request through — degraded replay protection is preferable to
  // blocking mutating operations.
  let existing: IdempotencyRecord | null = null;
  try {
    existing = await store.get(key);
  } catch (err: any) {
    logger.error("Idempotency store read failed; proceeding without replay protection", { err: err?.message });
    existing = null;
  }

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return NextResponse.json({ error: "IdempotencyKeyReused", message: "This Idempotency-Key was used with a different request body." }, { status: 409 });
    }

    const headers = new Headers({ "Idempotency-Replay": "true", "Idempotency-Key": key, "Content-Type": "application/json" });
    return new NextResponse(JSON.stringify(existing.body), { status: existing.statusCode, headers });
  }

  // No existing record — run handler and then persist the response for future replays.
  const response = await handler();

  // Capture response body safely
  let respBody: unknown = null;
  try {
    const clone = response.clone();
    const text = await clone.text();
    if (text) {
      try { respBody = JSON.parse(text); } catch { respBody = text; }
    } else {
      respBody = null;
    }
  } catch (err) {
    respBody = null;
  }

  try {
    await store.set(key, { fingerprint, statusCode: response.status, body: respBody, createdAt: Date.now() });
  } catch (err: any) {
    logger.error("Idempotency store write failed; response not persisted", { err: err?.message });
  }

  // Tag response as non-replay
  response.headers.set("Idempotency-Replay", "false");
  return response;
}
