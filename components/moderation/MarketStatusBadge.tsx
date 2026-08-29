'client';

import { Clock, AlertTriangle, ShieldAlert, Flag, XCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge, badgeVariants } from '@/components/ui/badge';

import type { ModerationState } from '@/types/moderation';
import { MODERATION_CONFIG } from './moderation-config';

const STATE_ICONS: Record<ModerationState, React.ElementType> = {
  under_review: Clock,
  paused: AlertTriangle,
  restricted: ShieldAlert,
  flagged: Flag,
  removed: XCircle,
  resolving: Loader2,
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
  const isResolving = state === 'resolving';

  const variantMap: Record<ModerationState, keyof typeof badgeVariants['variants]['variant']> = {
    under_review: 'info',
    paused: 'warning',
    restricted: 'danger',
    flagged: 'danger',
    removed: 'neutral',
    resolving: 'info',
  };
  const badge = (
    <Badge
      role="status"
      aria-label={`Market status: ${config.label}. ${config.description}`}
      variant={variantMap[state]}
      size="md"
      tabIndex={showTooltip ? 0 : undefined}
      className={cn(
        config.badgeClass,
        isResolving && 'animate-status-live-pulse',
        showTooltip && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
      {config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration=200>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
