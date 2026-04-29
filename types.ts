/**
 * Aggregate metric snapshot for a specific tenant within a rolling window.
 */
export interface MetricSnapshot {
  tenantId: string;
  streamCreations: number;
  settleAttempts: number;
  timestamp: number;
}

export interface AnomalyThresholds {
  creationBurstLimit: number; // e.g., new streams per hour
  settleRateLimit: number;    // e.g., settle attempts per hour
}

export interface AnomalyAlert {
  tenantId: string;
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE";
  observedValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

export enum ContractStreamStatus {
  ACTIVE = 0,
  PAUSED = 1,
  SETTLED = 2,
  CANCELLED = 3,
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SETTLED = "SETTLED",
  ENDED = "ENDED",
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
}
