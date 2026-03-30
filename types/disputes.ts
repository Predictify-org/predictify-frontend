export type DisputeState = 'none' | 'open' | 'voting' | 'ended' | 'executed';

export interface TallySide {
  label: string;
  amount: number;       // token units
  percentage: number;   // 0–100
}

export interface AuditReference {
  label: string;
  url: string;
}

export interface DisputeData {
  id: string;
  eventTitle: string;
  state: DisputeState;
  reason?: string;
  openCost?: number;            // tokens required to open
  stakingDeadline?: Date;
  votingDeadline?: Date;
  tally?: [TallySide, TallySide];
  userHasStaked?: boolean;
  userHasVoted?: boolean;
  outcome?: string;
  executedAt?: Date;
  auditRefs?: AuditReference[];
  penaltyInfo?: string;
}
