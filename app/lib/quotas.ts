/**
 * quotas.ts
 *
 * In-memory store for per-org and per-user quotas.
 *
 * Quotas cap the number of active streams an org or user may have
 * concurrently, and an optional monthly XLM volume limit.
 *
 * Admin CRUD:
 *   GET    /api/admin/quotas           — list all quotas
 *   POST   /api/admin/quotas           — create / upsert a quota
 *   GET    /api/admin/quotas/:id       — read one quota
 *   PUT    /api/admin/quotas/:id       — replace a quota
 *   DELETE /api/admin/quotas/:id       — remove a quota
 */

import crypto from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuotaScope = "org" | "user";

export interface Quota {
  /** Unique quota ID. */
  id: string;
  /** Whether this quota applies to an org or an individual user. */
  scope: QuotaScope;
  /** The org or user Stellar address this quota governs. */
  subject: string;
  /** Maximum number of concurrent active streams (0 = unlimited). */
  maxActiveStreams: number;
  /** Maximum monthly XLM volume in stroops (0 = unlimited). */
  maxMonthlyVolumeStroops: number;
  /** ISO-8601 timestamp when this quota was created. */
  createdAt: string;
  /** ISO-8601 timestamp when this quota was last updated. */
  updatedAt: string;
}

export interface QuotaInput {
  scope: QuotaScope;
  subject: string;
  maxActiveStreams?: number;
  maxMonthlyVolumeStroops?: number;
}

// ── In-memory store ───────────────────────────────────────────────────────────

const _store = new Map<string, Quota>();

// ── CRUD helpers ──────────────────────────────────────────────────────────────

/** Return all quotas as an array (newest first). */
export function listQuotas(): Quota[] {
  return [..._store.values()].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

/** Return a single quota by ID, or undefined if not found. */
export function getQuota(id: string): Quota | undefined {
  return _store.get(id);
}

/**
 * Create or replace the quota for a (scope, subject) pair.
 * If a quota for that pair already exists it is updated in-place.
 */
export function upsertQuota(input: QuotaInput): Quota {
  const existing = [..._store.values()].find(
    (q) => q.scope === input.scope && q.subject === input.subject,
  );

  const now = new Date().toISOString();

  const quota: Quota = {
    id:                      existing?.id ?? `quota-${crypto.randomUUID()}`,
    scope:                   input.scope,
    subject:                 input.subject.trim(),
    maxActiveStreams:         input.maxActiveStreams ?? 0,
    maxMonthlyVolumeStroops: input.maxMonthlyVolumeStroops ?? 0,
    createdAt:               existing?.createdAt ?? now,
    updatedAt:               now,
  };

  _store.set(quota.id, quota);
  return { ...quota };
}

/** Fully replace an existing quota by ID. Returns the updated quota or undefined. */
export function replaceQuota(id: string, input: QuotaInput): Quota | undefined {
  const existing = _store.get(id);
  if (!existing) return undefined;

  const updated: Quota = {
    ...existing,
    scope:                   input.scope,
    subject:                 input.subject.trim(),
    maxActiveStreams:         input.maxActiveStreams ?? 0,
    maxMonthlyVolumeStroops: input.maxMonthlyVolumeStroops ?? 0,
    updatedAt:               new Date().toISOString(),
  };

  _store.set(id, updated);
  return { ...updated };
}

/** Delete a quota by ID. Returns true if it existed, false otherwise. */
export function deleteQuota(id: string): boolean {
  return _store.delete(id);
}

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Clear all quotas — for use in tests only. */
export function _resetQuotasForTesting(): void {
  _store.clear();
}
