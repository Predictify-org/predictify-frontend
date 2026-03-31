'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WarningBanner } from '@/components/disputes/shared/WarningBanner';
import { CountdownTimer } from '@/components/disputes/shared/CountdownTimer';
import { TallyBar } from '@/components/disputes/shared/TallyBar';
import type { DisputeData, DisputeState } from '@/types/disputes';

interface VotingStateProps {
  data: DisputeData;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

export function VotingState({ data, onStateChange }: VotingStateProps) {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  const leftLabel = data.tally?.[0]?.label ?? 'Yes';
  const rightLabel = data.tally?.[1]?.label ?? 'No';

  const deadlinePassed =
    data.votingDeadline != null && data.votingDeadline.getTime() <= Date.now();

  const isDisabled = data.userHasVoted === true || deadlinePassed;
  const showWarning = selectedVote !== null && !isDisabled;

  return (
    <div className="flex flex-col gap-4">
      {/* Voting deadline — prominent, above controls */}
      {data.votingDeadline && (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <CountdownTimer deadline={data.votingDeadline} label="Voting deadline" />
        </div>
      )}

      {data.tally && <TallyBar tally={data.tally} showAmounts />}

      {/* Vote option buttons */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Cast your vote</p>
        <div className="flex gap-3">
          {[leftLabel, rightLabel].map((voteLabel) => (
            <Button
              key={voteLabel}
              variant={selectedVote === voteLabel ? 'default' : 'outline'}
              onClick={() => setSelectedVote(voteLabel)}
              disabled={isDisabled}
            >
              {voteLabel}
            </Button>
          ))}
        </div>
      </div>

      {showWarning && (
        <div className="flex flex-col gap-3">
          <WarningBanner
            variant="warning"
            title="Your vote is final"
            description={`You are voting "${selectedVote}". This action cannot be changed once confirmed.`}
          />
          <div className="flex gap-2">
            <Button onClick={() => onStateChange?.('voting', { userHasVoted: true })}>
              Confirm Vote
            </Button>
            <Button variant="outline" onClick={() => setSelectedVote(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {data.userHasVoted && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Your vote has been recorded.
        </p>
      )}
      {deadlinePassed && !data.userHasVoted && (
        <p className="text-sm text-muted-foreground">Voting has closed.</p>
      )}
    </div>
  );
}
