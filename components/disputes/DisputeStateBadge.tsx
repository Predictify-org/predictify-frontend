import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DisputeState } from '@/types/disputes';

interface DisputeStateBadgeProps {
  state: DisputeState;
}

const stateConfig: Record<DisputeState, { label: string; className: string }> = {
  none: { label: 'No Dispute', className: 'border-transparent bg-secondary text-secondary-foreground' },
  open: { label: 'Open', className: 'border-transparent bg-blue-500 text-white' },
  voting: { label: 'Voting', className: 'border-transparent bg-amber-500 text-white' },
  ended: { label: 'Ended', className: 'border-transparent bg-slate-500 text-white' },
  executed: { label: 'Executed', className: 'border-transparent bg-green-600 text-white' },
};

export function DisputeStateBadge({ state }: DisputeStateBadgeProps) {
  const config = stateConfig[state] ?? stateConfig.none;
  return (
    <Badge className={cn(config.className)} data-testid="dispute-state-badge">
      {config.label}
    </Badge>
  );
}
