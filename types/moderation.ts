// Moderation state vocabulary — extensible for future states
export type ModerationState =
  | 'under_review'
  | 'paused'
  | 'restricted'
  | 'flagged'
  | 'removed'
  | 'resolving'
  | 'reported';

export interface ModerationConfig {
  label: string;
  title: string;
  description: string;
  allowedActions: string;
  learnMoreHref: string;
  /** Tailwind classes for banner background + text + border */
  bannerClass: string;
  /** Tailwind classes for badge background + text */
  badgeClass: string;
}

export type ReportReasonCode =
  | 'misleading'
  | 'unresolvable'
  | 'illegal'
  | 'spam'
  | 'manipulation'
  | 'other';

export interface ReportReasonOption {
  code: ReportReasonCode;
  label: string;
  helpText: string;
}

export interface ReportMarketRequest {
  marketId: string;
  reason: ReportReasonCode;
  details?: string;
  evidenceUrl?: string;
}

export interface ReportMarketResponse {
  success: boolean;
  reportId: string;
  message?: string;
}
