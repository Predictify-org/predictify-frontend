'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WarningBanner } from '@/components/disputes/shared/WarningBanner';
import { CountdownTimer } from '@/components/disputes/shared/CountdownTimer';
import { TallyBar } from '@/components/disputes/shared/TallyBar';
import type { DisputeData, DisputeState } from '@/types/disputes';

interface OpenStateProps {
  data: DisputeData;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

function formatDeadline(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function OpenState({ data, onStateChange }: OpenStateProps) {
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');

  const leftLabel = data.tally?.[0]?.label ?? 'Yes';
  const rightLabel = data.tally?.[1]?.label ?? 'No';

  const deadlinePassed =
    data.stakingDeadline != null && data.stakingDeadline.getTime() <= Date.now();

  const isDisabled = data.userHasStaked === true || deadlinePassed;
  const showWarning = selectedSide !== null && !isDisabled;

  return (
    <div className="flex flex-col gap-4">
      {data.reason && <p className="text-sm text-muted-foreground">{data.reason}</p>}

      {data.stakingDeadline && (
        <CountdownTimer deadline={data.stakingDeadline} label="Staking deadline" />
      )}

      {data.tally && <TallyBar tally={data.tally} showAmounts />}

      <div className="flex flex-col gap-2">
        <Label>Select your side</Label>
        <div className="flex gap-4">
          {[leftLabel, rightLabel].map((sideLabel) => (
            <label key={sideLabel} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="dispute-side"
                value={sideLabel}
                checked={selectedSide === sideLabel}
                onChange={() => setSelectedSide(sideLabel)}
                disabled={isDisabled}
                className="accent-primary"
              />
              <span className="text-sm">{sideLabel}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stake-amount">Stake amount (tokens)</Label>
        <Input
          id="stake-amount"
          type="number"
          min={1}
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isDisabled}
        />
      </div>

      {showWarning && (
        <div className="flex flex-col gap-3">
          <WarningBanner
            variant="warning"
            title="Confirm your stake"
            description={`You are staking ${amount || 0} tokens on "${selectedSide}". If your side loses, you forfeit your stake. Deadline: ${data.stakingDeadline ? formatDeadline(data.stakingDeadline) : 'N/A'}.`}
          />
          <div className="flex gap-2">
            <Button onClick={() => onStateChange?.('open', { userHasStaked: true })}>
              Confirm Stake
            </Button>
            <Button variant="outline" onClick={() => { setSelectedSide(null); setAmount(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {data.userHasStaked && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Your stake has been submitted.
        </p>
      )}
      {deadlinePassed && !data.userHasStaked && (
        <p className="text-sm text-muted-foreground">Staking deadline has passed.</p>
      )}
    </div>
  );
}
