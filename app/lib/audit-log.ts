import { createHash, randomUUID } from "crypto";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import type {
  AuditActor,
  AuditActorRole,
  AuditEntry,
  AuditEntryInput,
  AuditExportRow,
  AuditListFilters,
  AuditMetadataValue,
} from "@/app/types/audit";

export const AUDIT_LOG_RETENTION_DAYS = 365 * 7;

const VALID_ROLES = new Set<AuditActorRole>([
  "user",
  "support",
  "admin",
  "finance",
  "security",
  "compliance",
  "system",
]);

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        const nestedValue = (value as Record<string, unknown>)[key];
        if (nestedValue !== undefined) {
          accumulator[key] = sortKeys(nestedValue);
        }
        return accumulator;
      }, {});
  }

  return value;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortKeys(value))).digest("hex");
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === "object" && !Object.isFrozen(nested)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function addRetention(timestamp: string): string {
  const retentionDate = new Date(timestamp);
  retentionDate.setUTCDate(retentionDate.getUTCDate() + AUDIT_LOG_RETENTION_DAYS);
  return retentionDate.toISOString();
}

function redactTargetAccount(account: string | undefined): string | null {
  if (!account) {
    return null;
  }
  if (account.length <= 8) {
    return `${account.slice(0, 2)}***${account.slice(-2)}`;
  }
  return `${account.slice(0, 4)}***${account.slice(-4)}`;
}

export class AppendOnlyAuditLogStore {
  private readonly entries: AuditEntry[] = [];

  append(input: AuditEntryInput): AuditEntry {
    const lastEntry = this.entries[this.entries.length - 1];
    const timestamp = input.timestamp ?? new Date().toISOString();
    const beforeHash = input.before ? hashValue(input.before) : null;
    const afterHash = input.after ? hashValue(input.after) : null;
    const diffHash =
      input.diffHash ??
      (beforeHash || afterHash
        ? hashValue({
            afterHash,
            beforeHash,
          })
        : null);
    const prevHash = lastEntry?.entryHash ?? null;
    const entryHash = hashValue({
      action: input.action,
      actor: input.actor,
      afterHash,
      beforeHash,
      diffHash,
      metadata: input.metadata ?? null,
      prevHash,
      requestId: input.requestId,
      target: input.target,
      timestamp,
    });

    const entry = deepFreeze({
      action: input.action,
      actor: cloneValue(input.actor),
      afterHash,
      beforeHash,
      diffHash,
      entryHash,
      id: `audit-${randomUUID()}`,
      metadata: input.metadata ? cloneValue(input.metadata) : undefined,
      prevHash,
      requestId: input.requestId,
      retentionUntil: addRetention(timestamp),
      target: cloneValue(input.target),
      timestamp,
    } satisfies AuditEntry);

    this.entries.push(entry);
    return cloneValue(entry);
  }

  list(filters: AuditListFilters = {}): AuditEntry[] {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 250);

    const results = this.entries
      .filter((entry) => {
        if (filters.actorId && entry.actor.id !== filters.actorId) {
          return false;
        }
        if (filters.role && entry.actor.role !== filters.role) {
          return false;
        }
        if (filters.action && entry.action !== filters.action) {
          return false;
        }
        if (filters.targetId && entry.target.id !== filters.targetId) {
          return false;
        }
        if (filters.requestId && entry.requestId !== filters.requestId) {
          return false;
        }
        if (filters.q) {
          const haystack = [
            entry.actor.id,
            entry.actor.role,
            entry.action,
            entry.target.id,
            entry.target.account ?? "",
            entry.requestId,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(filters.q.toLowerCase())) {
            return false;
          }
        }
        return true;
      })
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, limit);

    return results.map((entry) => cloneValue(entry));
  }

  exportRows(filters: AuditListFilters = {}): AuditExportRow[] {
    return this.list(filters).map((entry) => ({
      action: entry.action,
      actorId: entry.actor.id,
      actorRole: entry.actor.role,
      afterHash: entry.afterHash,
      beforeHash: entry.beforeHash,
      diffHash: entry.diffHash,
      entryHash: entry.entryHash,
      id: entry.id,
      metadata: entry.metadata,
      prevHash: entry.prevHash,
      redactedTargetAccount: redactTargetAccount(entry.target.account),
      redactionPolicy: "mask-target-account",
      requestId: entry.requestId,
      retentionUntil: entry.retentionUntil,
      targetId: entry.target.id,
      targetType: entry.target.type,
      timestamp: entry.timestamp,
    }));
  }

  count(): number {
    return this.entries.length;
  }

  assertIntegrity(): boolean {
    let previousHash: string | null = null;

    for (const entry of this.entries) {
      const recalculatedHash = hashValue({
        action: entry.action,
        actor: entry.actor,
        afterHash: entry.afterHash,
        beforeHash: entry.beforeHash,
        diffHash: entry.diffHash,
        metadata: entry.metadata ?? null,
        prevHash: entry.prevHash,
        requestId: entry.requestId,
        target: entry.target,
        timestamp: entry.timestamp,
      });

      if (entry.prevHash !== previousHash) {
        return false;
      }

      if (entry.entryHash !== recalculatedHash) {
        return false;
      }

      previousHash = entry.entryHash;
    }

    return true;
  }

  updateEntry(_id: string, _changes: Partial<AuditEntry>) {
    throw new Error("AUDIT_LOG_APPEND_ONLY");
  }

  deleteEntry(_id: string) {
    throw new Error("AUDIT_LOG_APPEND_ONLY");
  }

  reset(seedEntries: AuditEntryInput[] = defaultSeedAuditEntries) {
    this.entries.splice(0, this.entries.length);
    for (const entry of seedEntries) {
      this.append(entry);
    }
  }
}

function normalizeRole(role: string | null): AuditActorRole | null {
  if (!role) {
    return null;
  }
  return VALID_ROLES.has(role as AuditActorRole) ? (role as AuditActorRole) : null;
}

export function buildRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    request.headers.get("idempotency-key") ??
    `mock-request-${randomUUID()}`
  );
}

export function resolveAuditActor(request: Request): AuditActor {
  const authenticatedActor = tryAuthenticateRequest(request);
  if (authenticatedActor) {
    return { id: authenticatedActor.actorId, role: authenticatedActor.role };
  }

  const headerRole = normalizeRole(request.headers.get("x-streampay-actor-role"));
  const headerActorId = request.headers.get("x-streampay-actor-id");
  if (headerRole && headerActorId) {
    return { id: headerActorId, role: headerRole };
  }

  return { id: "system:mock", role: "system" };
}

export function recordPrivilegedStreamAuditEvent(args: {
  request: Request;
  action: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  streamId: string;
  targetAccount?: string;
  metadata?: Record<string, AuditMetadataValue>;
}): AuditEntry {
  return auditLogStore.append({
    action: args.action,
    actor: resolveAuditActor(args.request),
    after: args.after,
    before: args.before,
    metadata: args.metadata,
    requestId: buildRequestId(args.request),
    target: {
      account: args.targetAccount,
      id: args.streamId,
      type: "stream",
    },
  });
}

const defaultSeedAuditEntries: AuditEntryInput[] = [
  {
    action: "stream.stop.bootstrap",
    actor: { id: "system:seed", role: "system" },
    after: {
      nextAction: "withdraw",
      status: "ended",
      streamId: "stream-yusuf",
    },
    before: {
      nextAction: "pause",
      status: "active",
      streamId: "stream-yusuf",
    },
    metadata: {
      note: "synthetic bootstrap event",
    },
    requestId: "seed-request-stream-yusuf",
    target: {
      account: "acct_stream_yusuf_demo",
      id: "stream-yusuf",
      type: "stream",
    },
    timestamp: "2026-04-27T20:00:00Z",
  },
];

export const auditLogStore = new AppendOnlyAuditLogStore();
auditLogStore.reset();

export function resetAuditLogStore() {
  auditLogStore.reset();
}
