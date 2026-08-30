'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WarningBanner } from '@/components/disputes/shared/WarningBanner';
import { CountdownTimer } from '@/components/disputes/shared/CountdownTimer';
import { TallyBar } from '@/components/disputes/shared/TallyBar';
import { useLedgerTime } from '@/components/disputes/shared/useLedgerTime';
import type {
  DisputeData,
  DisputeState,
} from '@/types/disputes';
import {
  OutcomeIcon,
  getVariantByIndex,
} from '@/components/icons/OutcomeIcons';

interface VotingStateProps {
  data: DisputeData;
  onStateChange?: (
    next: DisputeState,
    updated: Partial<DisputeData>
  ) => void;
}

export function VotingState({
  data,
  onStateChange,
}: VotingStateProps) {
  const [selectedVote, setSelectedVote] =
    useState<string | null>(null);

  const {
    ledgerTime,
    status: ledgerStatus,
    error: ledgerError,
    retry,
  } = useLedgerTime();

  const leftLabel =
    data.tally?.[0]?.label ?? 'Yes';

  const rightLabel =
    data.tally?.[1]?.label ?? 'No';

  const requiresLedgerTime =
    data.votingDeadline != null;

  const ledgerReady =
    !requiresLedgerTime ||
    ledgerStatus === 'ready';

  const deadlinePassed =
    data.votingDeadline != null &&
    ledgerTime != null &&
    data.votingDeadline.getTime() <=
      ledgerTime.getTime();

  /*
   * Fail closed unless the latest ledger time has been verified.
   * This prevents stale or incorrect browser time from enabling a late vote.
   */
  const isDisabled =
    data.userHasVoted === true ||
    deadlinePassed ||
    !ledgerReady;

  const showWarning =
    selectedVote !== null && !isDisabled;

  const showLedgerProblem =
    requiresLedgerTime &&
    ledgerStatus !== 'ready' &&
    ledgerStatus !== 'loading';

  return (
    <div className="flex flex-col gap-4">
      {data.votingDeadline && (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <CountdownTimer
            deadline={data.votingDeadline}
            label="Voting deadline"
            currentTime={ledgerTime}
          />
        </div>
      )}

      {requiresLedgerTime &&
        ledgerStatus === 'loading' && (
          <p
            className="text-sm text-muted-foreground"
            role="status"
          >
            Verifying voting deadline from ledger…
          </p>
        )}

      {showLedgerProblem && (
        <div
          className="flex items-center gap-2"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {ledgerError ??
              'Unable to verify the current ledger time.'}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retry}
          >
            Retry
          </Button>
        </div>
      )}

      {data.tally && (
        <TallyBar
          tally={data.tally}
          showAmounts
        />
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Cast your vote
        </p>

        <div className="flex gap-3">
          {[leftLabel, rightLabel].map(
            (voteLabel, index) => (
              <Button
                key={voteLabel}
                variant={
                  selectedVote === voteLabel
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  setSelectedVote(voteLabel)
                }
                disabled={isDisabled}
                className="flex items-center gap-1.5"
              >
                <OutcomeIcon
                  variant={getVariantByIndex(
                    index
                  )}
                  aria-hidden
                />

                {voteLabel}
              </Button>
            )
          )}
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
            <Button
              onClick={() =>
                onStateChange?.('voting', {
                  userHasVoted: true,
                })
              }
              disabled={isDisabled}
            >
              Confirm Vote
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setSelectedVote(null)
              }
            >
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

      {deadlinePassed &&
        !data.userHasVoted && (
          <p className="text-sm text-muted-foreground">
            Voting has closed.
          </p>
        )}
    </div>
  );
}