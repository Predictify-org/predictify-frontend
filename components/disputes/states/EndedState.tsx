import { TallyBar } from '@/components/disputes/shared/TallyBar';
import { OutcomeChip } from '@/components/ui/OutcomeChip';
import type { DisputeData, DisputeState } from '@/types/disputes';
import { OutcomeIcon } from '@/components/icons/OutcomeIcons';

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

  // Determine which side is leading (index 0 = positive/▲, index 1 = negative/▽)
  const leadingIndex =
    data.tally && data.tally[0].percentage >= data.tally[1].percentage ? 0 : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Voting has closed. The outcome is awaiting execution.
        </p>
        <DisputeOutcomeExplainer data={data} eligibleForAppeal={eligibleForAppeal}>
          <button className="text-sm text-primary hover:underline font-medium">
            How was this decided?
          </button>
        </DisputeOutcomeExplainer>
      </div>

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
