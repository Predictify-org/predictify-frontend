import { CheckCircle2, CircleDot, MinusCircle, Square, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DisputeState } from '@/types/disputes';

interface DisputeStateBadgeProps {
  state: DisputeState;
}

const stateConfig: Record
  DisputeState,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  none: {
    label: 'No Dispute',
    className: 'border-transparent bg-secondary text-secondary-foreground',
    Icon: MinusCircle,
  },
  open: {
    label: 'Open',
    className: 'border-transparent bg-blue-500 text-white',
    Icon: CircleDot,
  },
  voting: {
    label: 'Voting',
    className: 'border-transparent bg-amber-500 text-white',
    Icon: Vote,
  },
  ended: {
    label: 'Ended',
    className: 'border-transparent bg-slate-500 text-white',
    Icon: Square,
  },
  executed: {
    label: 'Executed',
    className: 'border-transparent bg-green-600 text-white',
    Icon: CheckCircle2,
  },
};

export function DisputeStateBadge({ state }: DisputeStateBadgeProps) {
  const config = stateConfig[state] ?? stateConfig.none;
  const { Icon } = config;
  return (
    <Badge
      className={cn('inline-flex items-center gap-1', config.className)}
      data-testid="dispute-state-badge"
      aria-label={`Dispute state: ${config.label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
