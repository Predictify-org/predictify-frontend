import { TallySide } from '@/types/disputes';

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

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span>{left.label}</span>
        <span>{right.label}</span>
      </div>

      {showAmounts && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{left.amount.toLocaleString()} tokens</span>
          <span>{right.amount.toLocaleString()} tokens</span>
        </div>
      )}

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${leftPct}%` }}
          aria-label={`${left.label}: ${leftPct.toFixed(1)}%`}
        />
        <div
          className="bg-rose-500 transition-all duration-300"
          style={{ width: `${rightPct}%` }}
          aria-label={`${right.label}: ${rightPct.toFixed(1)}%`}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftPct.toFixed(1)}%</span>
        <span>{rightPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}
