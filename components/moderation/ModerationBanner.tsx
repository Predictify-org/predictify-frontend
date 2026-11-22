'use client';

import { AlertTriangle, Clock, ShieldAlert, Flag, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ModerationState } from '@/types/moderation';
import { MODERATION_CONFIG } from './moderation-config';

const STATE_ICONS: Record<ModerationState, React.ElementType> = {
  under_review: Clock,
  paused: AlertTriangle,
  restricted: ShieldAlert,
  flagged: Flag,
  removed: XCircle,
  resolving: Loader2,
  reported: AlertTriangle,
};

export interface ModerationBannerProps {
  state?: ModerationState;
  className?: string;
  /** Override the default "learn more" href */
  learnMoreHref?: string;
  /** When true, renders the 'reported' moderation state */
  reportThresholdReached?: boolean;
  reportThreshold?: boolean;
  reportThresholdMet?: boolean;
  isReportThresholdReached?: boolean;
  isReportThresholdMet?: boolean;
}

export function ModerationBanner({
  state = 'under_review',
  className,
  learnMoreHref,
  reportThresholdReached,
  reportThreshold,
  reportThresholdMet,
  isReportThresholdReached,
  isReportThresholdMet,
}: ModerationBannerProps) {
  const isReportThreshold = Boolean(
    reportThresholdReached ||
    reportThreshold ||
    reportThresholdMet ||
    isReportThresholdReached ||
    isReportThresholdMet
  );
  const effectiveState: ModerationState = isReportThreshold ? 'reported' : state;
  const config = MODERATION_CONFIG[effectiveState] ?? MODERATION_CONFIG.under_review;
  const Icon = STATE_ICONS[effectiveState] ?? STATE_ICONS.under_review;
  const href = learnMoreHref ?? config.learnMoreHref;

  return (
    <Alert
      role="status"
      aria-label={`Market status: ${config.label}`}
      className={cn(config.bannerClass, 'flex flex-col gap-1', className)}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <AlertTitle className="font-semibold">{config.title}</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>{config.description}</p>
        <p className="font-medium">{config.allowedActions}</p>
        <a
          href={href}
          className="inline-flex items-center gap-1 text-sm underline underline-offset-2 opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 rounded"
          aria-label={`Learn more about ${config.label} status`}
        >
          Learn more →
        </a>
      </AlertDescription>
    </Alert>
  );
}
