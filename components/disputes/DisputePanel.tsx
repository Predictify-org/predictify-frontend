'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DisputeStateBadge } from '@/components/disputes/DisputeStateBadge';
import { NoneState } from '@/components/disputes/states/NoneState';
import { OpenState } from '@/components/disputes/states/OpenState';
import { VotingState } from '@/components/disputes/states/VotingState';
import { EndedState } from '@/components/disputes/states/EndedState';
import { ExecutedState } from '@/components/disputes/states/ExecutedState';
import type { DisputeData, DisputeState } from '@/types/disputes';

const VALID_STATES: DisputeState[] = ['none', 'open', 'voting', 'ended', 'executed'];

interface DisputePanelProps {
  data: DisputeData | null | undefined;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

export function DisputePanel({ data, onStateChange }: DisputePanelProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  const resolvedState: DisputeState = VALID_STATES.includes(data.state as DisputeState)
    ? (data.state as DisputeState)
    : 'none';

  const stateLabels: Record<DisputeState, string> = {
    none: 'No active dispute',
    open: 'Dispute open — staking',
    voting: 'Community voting',
    ended: 'Voting ended',
    executed: 'Outcome executed',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <CardTitle className="text-base font-semibold leading-snug">
          {data.eventTitle}
        </CardTitle>
        <DisputeStateBadge state={resolvedState} />
      </CardHeader>

      <CardContent className="transition-all duration-300">
        {resolvedState === 'none' && (
          <NoneState data={data} onStateChange={onStateChange} />
        )}
        {resolvedState === 'open' && (
          <OpenState data={data} onStateChange={onStateChange} />
        )}
        {resolvedState === 'voting' && (
          <VotingState data={data} onStateChange={onStateChange} />
        )}
        {resolvedState === 'ended' && (
          <EndedState data={data} onStateChange={onStateChange} />
        )}
        {resolvedState === 'executed' && (
          <ExecutedState data={data} onStateChange={onStateChange} />
        )}
      </CardContent>

      <CardFooter className="border-t pt-3">
        <p className="text-xs text-muted-foreground">{stateLabels[resolvedState]}</p>
      </CardFooter>
    </Card>
  );
}
