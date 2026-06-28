import { TallyBar } from '@/components/disputes/shared/TallyBar';
import { OutcomeChip } from '@/components/ui/OutcomeChip';
import type { DisputeData, DisputeState } from '@/types/disputes';

interface EndedStateProps {
  data: DisputeData;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

export function EndedState({ data }: EndedStateProps) {
  const leadingOutcome =
    data.outcome ??
    (data.tally && data.tally[0].percentage >= data.tally[1].percentage
      ? data.tally[0].label
      : data.tally?.[1]?.label);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Voting has closed. The outcome is awaiting execution.
      </p>

      {data.tally && <TallyBar tally={data.tally} showAmounts />}

      {leadingOutcome && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Leading outcome:</span>
          <OutcomeChip variant="positive">{leadingOutcome}</OutcomeChip>
        </div>
      )}
    </div>
  );
}
