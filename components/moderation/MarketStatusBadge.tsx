'use client';

import { Clock, AlertTriangle, ShieldAlert, Flag, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ModerationState } from '@/types/moderation';
import { MODERATION_CONFIG } from './moderation-config';

const STATE_ICONS: Record<ModerationState, React.ElementType> = {
  under_review: Clock,
  paused: AlertTriangle,
  restricted: ShieldAlert,
  flagged: Flag,
  removed: XCircle,
};

interface MarketStatusBadgeProps {
  state: ModerationState;
  className?: string;
  /** Show tooltip with short description on hover */
  showTooltip?: boolean;
}

export function MarketStatusBadge({ state, className, showTooltip = true }: MarketStatusBadgeProps) {
  const config = MODERATION_CONFIG[state];
  const Icon = STATE_ICONS[state];

  const badge = (
    <span
      role="status"
      aria-label={`Market status: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        config.badgeClass,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
