import { Check, X } from 'lucide-react';
import { TallySide } from '@/types/disputes';
import { cn } from '@/lib/utils';
import { OutcomeIcon, getVariantByIndex } from '@/components/icons/OutcomeIcons';

interface TallyBarProps {
  tally: [TallySide, TallySide];
  showAmounts?: boolean;
}

function normalise(a: number, b: number): [number, number] {
  const total = a + b;
  if (total === 0) return [50, 50];
  return [(a / total) * 100, (b / total) * 100];
}

export function TallyBar({ tally, showAmounts = false }: TallyBarProps) {
  const [left, right] = tally;
  const [leftPct, rightPct] = normalise(left.percentage, right.percentage);

  // Accessible summary of the whole bar.
  const ariaSummary = showAmounts
    ? `${left.label}: ${leftPct.toFixed(1)} percent, ${left.amount.toLocaleString()} tokens. ` +
      `${right.label}: ${rightPct.toFixed(1)} percent, ${right.amount.toLocaleString()} tokens.`
    : `${left.label}: ${leftPct.toFixed(1)} percent. ${right.label}: ${rightPct.toFixed(1)} percent.`;

  return (
    <div className="w-full space-y-1">
      {/*
       * Label row — each label is prefixed with a color-blind safe shape icon.
       * Icons are aria-hidden; the bar's aria-label above is the primary
       * accessible description (WCAG 2.1 AA 1.4.1 Use of Color).
       *
       * Shape → side mapping (mirrors OUTCOME_COLOR_CLASS in OutcomeIcons.tsx):
       *   ▲ TriangleUp  → index 0 (left / "Yes")
       *   ▽ TriangleDown → index 1 (right / "No")
       */}
      <div className="flex justify-between text-xs font-medium">
        <span className="flex items-center gap-1">
          <OutcomeIcon variant={getVariantByIndex(0)} aria-hidden className="text-chart-1" />
          {left.label}
        </span>
        <span className="flex items-center gap-1">
          {right.label}
          <OutcomeIcon variant={getVariantByIndex(1)} aria-hidden className="text-chart-2" />
        </span>
      </div>

      {showAmounts && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{left.amount.toLocaleString()} tokens</span>
          <span>{right.amount.toLocaleString()} tokens</span>
        </div>
      )}

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={ariaSummary}
      >
        <div
          className={cn(
            'bg-chart-1 transition-all duration-300 flex items-center justify-center',
            'text-[10px] font-medium text-white'
          )}
          style={{ width: `${leftPct}%` }}
          aria-label={`${left.label}: ${leftPct.toFixed(1)}%`}
        >
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </div>
        <div
          className={cn(
            'bg-chart-2 transition-all duration-300 flex items-center justify-center',
            'text-[10px] font-medium text-white'
          )}
          style={{ width: `${rightPct}%` }}
          aria-label={`${right.label}: ${rightPct.toFixed(1)}%`}
        >
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftPct.toFixed(1)}%</span>
        <span>{rightPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}
