import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { TallySide } from '@/types/disputes';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';

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
  const reducedMotion = useReducedMotion();
  const animatedLeftPct = useCountUp(leftPct, 0, 400);
  const animatedRightPct = useCountUp(rightPct, 0, 400);
  const animatedLeftAmount = useCountUp(left.amount, 0, 400);
  const animatedRightAmount = useCountUp(right.amount, 0, 400);
  const [liveMessage, setLiveMessage] = React.useState('');
  const lastAnnouncedMessage = React.useRef('');
  const hasMountedRef = React.useRef(false);

  const leftPctLabel = `${animatedLeftPct.toFixed(1)}%`;
  const rightPctLabel = `${animatedRightPct.toFixed(1)}%`;
  const leftAmountLabel = `${Math.round(animatedLeftAmount).toLocaleString()} tokens`;
  const rightAmountLabel = `${Math.round(animatedRightAmount).toLocaleString()} tokens`;

  const ariaSummary = showAmounts
    ? `${left.label}: ${animatedLeftPct.toFixed(1)} percent, ${leftAmountLabel}. ` +
      `${right.label}: ${animatedRightPct.toFixed(1)} percent, ${rightAmountLabel}.`
    : `${left.label}: ${animatedLeftPct.toFixed(1)} percent. ${right.label}: ${animatedRightPct.toFixed(1)} percent.`;

  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastAnnouncedMessage.current = ariaSummary;
      return;
    }

    if (ariaSummary && ariaSummary !== lastAnnouncedMessage.current) {
      setLiveMessage(ariaSummary);
      lastAnnouncedMessage.current = ariaSummary;
    }
  }, [ariaSummary]);

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span>{left.label}</span>
        <span>{right.label}</span>
      </div>

      {showAmounts && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{leftAmountLabel}</span>
          <span>{rightAmountLabel}</span>
        </div>
      )}

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={ariaSummary}
      >
        <motion.div
          className={cn(
            'bg-chart-1 flex items-center justify-center',
            'text-[10px] font-medium text-white'
          )}
          style={{ width: `${animatedLeftPct}%` }}
          animate={{ width: `${animatedLeftPct}%` }}
          transition={{ type: 'spring', damping: 26, stiffness: 240, duration: reducedMotion ? 0 : undefined }}
          aria-label={`${left.label}: ${animatedLeftPct.toFixed(1)}%`}
        >
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </motion.div>
        <motion.div
          className={cn(
            'bg-chart-2 flex items-center justify-center',
            'text-[10px] font-medium text-white'
          )}
          style={{ width: `${animatedRightPct}%` }}
          animate={{ width: `${animatedRightPct}%` }}
          transition={{ type: 'spring', damping: 26, stiffness: 240, duration: reducedMotion ? 0 : undefined }}
          aria-label={`${right.label}: ${animatedRightPct.toFixed(1)}%`}
        >
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </motion.div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftPctLabel}</span>
        <span>{rightPctLabel}</span>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </div>
  );
}
