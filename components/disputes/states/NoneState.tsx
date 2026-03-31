'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WarningBanner } from '@/components/disputes/shared/WarningBanner';
import type { DisputeData, DisputeState } from '@/types/disputes';

interface NoneStateProps {
  data: DisputeData;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

export function NoneState({ data, onStateChange }: NoneStateProps) {
  const [showWarning, setShowWarning] = useState(false);

  const cost = data.openCost ?? 50;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        No dispute is currently active for this event.
      </p>

      {!showWarning ? (
        <Button onClick={() => setShowWarning(true)}>Open Dispute</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <WarningBanner
            variant="warning"
            title="Are you sure?"
            description={`Opening a dispute costs ${cost} tokens and cannot be undone.`}
          />
          <div className="flex gap-2">
            <Button onClick={() => onStateChange?.('open', {})}>Confirm</Button>
            <Button variant="outline" onClick={() => setShowWarning(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
