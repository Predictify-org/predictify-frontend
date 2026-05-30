export type AuditActorRole =
  | "user"
  | "support"
  | "admin"
  | "finance"
  | "security"
  | "compliance"
  | "system";

export interface AuditActor {
  id: string;
  role: AuditActorRole;
}

export interface AuditTarget {
  type: "stream" | "account";
  id: string;
  account?: string;
}

export type AuditMetadataValue = string | number | boolean | null;
export type AuditSnapshot = Record<string, unknown> | null;

export interface AuditEntryInput {
  actor: AuditActor;
  target: AuditTarget;
  action: string;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
  diffHash?: string | null;
  requestId: string;
  timestamp?: string;
  metadata?: Record<string, AuditMetadataValue>;
}

export interface AuditEntry {
  id: string;
  actor: AuditActor;
  target: AuditTarget;
  action: string;
  beforeHash: string | null;
  afterHash: string | null;
  diffHash: string | null;
  requestId: string;
  timestamp: string;
  prevHash: string | null;
  entryHash: string;
  retentionUntil: string;
  metadata?: Record<string, AuditMetadataValue>;
}

export interface AuditListFilters {
  actorId?: string | null;
  role?: AuditActorRole | null;
  action?: string | null;
  targetId?: string | null;
  requestId?: string | null;
  q?: string | null;
  limit?: number;
}

export interface AuditExportRow {
  id: string;
  actorId: string;
  actorRole: AuditActorRole;
  targetType: AuditTarget["type"];
  targetId: string;
  redactedTargetAccount: string | null;
  action: string;
  beforeHash: string | null;
  afterHash: string | null;
  diffHash: string | null;
  requestId: string;
  timestamp: string;
  prevHash: string | null;
  entryHash: string;
  retentionUntil: string;
  metadata?: Record<string, AuditMetadataValue>;
  redactionPolicy: "mask-target-account";
}
