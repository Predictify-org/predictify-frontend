import type { ReportReasonCode, ReportReasonOption } from '@/types/moderation';

export const REPORT_REASONS: readonly ReportReasonOption[] = [
  {
    code: 'misleading',
    label: 'Misleading',
    helpText: 'Resolution criteria or market rules are vague, contradictory, or intentionally deceptive.',
  },
  {
    code: 'unresolvable',
    label: 'Unresolvable',
    helpText: 'The event outcome cannot be objectively verified or determined before or at the resolution date.',
  },
  {
    code: 'illegal',
    label: 'Illegal',
    helpText: 'Involves illicit activities, dangerous behavior, or content that violates applicable laws.',
  },
  {
    code: 'spam',
    label: 'Spam',
    helpText: 'Promotional spam, duplicate content, or nonsense market descriptions.',
  },
  {
    code: 'manipulation',
    label: 'Manipulation',
    helpText: 'Suspected insider betting, outcome tampering, or malicious market creation.',
  },
  {
    code: 'other',
    label: 'Other',
    helpText: 'Other violations of community guidelines not covered by the categories above.',
  },
] as const;

export const REPORT_REASON_CODES: readonly ReportReasonCode[] = [
  'misleading',
  'unresolvable',
  'illegal',
  'spam',
  'manipulation',
  'other',
] as const;

export const REPORT_REASON_MAP: Record<ReportReasonCode, ReportReasonOption> =
  REPORT_REASONS.reduce((acc, curr) => {
    acc[curr.code] = curr;
    return acc;
  }, {} as Record<ReportReasonCode, ReportReasonOption>);

export function isValidReportReason(code: string): code is ReportReasonCode {
  return (REPORT_REASON_CODES as readonly string[]).includes(code);
}
