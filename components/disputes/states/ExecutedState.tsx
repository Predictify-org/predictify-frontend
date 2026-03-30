import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TallyBar } from '@/components/disputes/shared/TallyBar';
import { DetailsAccordion } from '@/components/disputes/shared/DetailsAccordion';
import type { DisputeData, DisputeState } from '@/types/disputes';

interface ExecutedStateProps {
  data: DisputeData;
  onStateChange?: (next: DisputeState, updated: Partial<DisputeData>) => void;
}

export function ExecutedState({ data }: ExecutedStateProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Prominent outcome */}
      {data.outcome && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Final outcome:</span>
          <Badge className="border-transparent bg-green-600 text-white text-sm px-3 py-1">
            {data.outcome}
          </Badge>
        </div>
      )}

      {/* Execution timestamp */}
      {data.executedAt && (
        <p className="text-xs text-muted-foreground">
          Executed at:{' '}
          {data.executedAt.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}

      {/* Audit references */}
      {data.auditRefs && data.auditRefs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Audit references
          </p>
          <ul className="flex flex-col gap-1">
            {data.auditRefs.map((ref) => (
              <li key={ref.url}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                >
                  {ref.label}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progressive disclosure: full tally, audit trail, penalty info */}
      <DetailsAccordion>
        {data.tally && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Full tally breakdown</p>
            <TallyBar tally={data.tally} showAmounts />
          </div>
        )}
        {data.penaltyInfo && (
          <p className="text-xs text-muted-foreground">{data.penaltyInfo}</p>
        )}
      </DetailsAccordion>
    </div>
  );
}
