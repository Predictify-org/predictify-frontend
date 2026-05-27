export interface MetricSnapshot {
  tenantId: string;
  streamCreations: number;
  settleAttempts: number;
  timestamp: number;
  stellarSubmissionsTotal?: number;
  stellarSubmissionsFailed?: number;
  dlqDepth?: number;
  oldestPendingJobSeconds?: number;
  p95SettlementLatencySeconds?: number;
}

export interface AnomalyThresholds {
  creationBurstLimit: number;
  settleRateLimit: number;
  submissionFailureThreshold?: number;
  maxDlqDepth?: number;
}

export interface AnomalyAlert {
  tenantId: string;
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE" | "HIGH_SUBMISSION_FAILURE_RATE" | "DLQ_DEPTH_EXCEEDED";
  observedValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

export enum ContractStreamStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SETTLED = "SETTLED",
  ENDED = "ENDED",
  CANCELLED = "CANCELLED",
}

export interface OnChainStream {
  id: string;
  recipient_address: string;
  total_amount: bigint;
  released_amount: bigint;
  velocity: bigint;
  last_update_timestamp: number;
  status: ContractStreamStatus;
}

export interface InvariantResult {
  isValid: boolean;
  error?: string;
}
