import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { TallySide } from '@/types/disputes';
import { cn } from '@/lib/utils';
import { OutcomeIcon, getVariantByIndex } from '@/components/icons/OutcomeIcons';
import { LiveRegion } from '@/components/ui/live-region';
import { useCountUp } from '@/lib/use-count-up';

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

  const leftPctLabel = `${animatedLeftPct.toFixed(1)}%`;
  const rightPctLabel = `${animatedRightPct.toFixed(1)}%`;
  const leftAmountLabel = `${Math.round(animatedLeftAmount).toLocaleString()} tokens`;
  const rightAmountLabel = `${Math.round(animatedRightAmount).toLocaleString()} tokens`;

  // Compute aria summary from the TARGET (final) prop values, not the animated
  // intermediates.  This keeps screen-reader announcements clean: one clear
  // message per tally update instead of 60 fps of noisy partial values during
  // the visual count-up animation.
  const ariaLeftAmountLabel = `${Math.round(left.amount).toLocaleString()} tokens`;
  const ariaRightAmountLabel = `${Math.round(right.amount).toLocaleString()} tokens`;
  const ariaSummary = showAmounts
    ? `${left.label}: ${leftPct.toFixed(1)} percent, ${ariaLeftAmountLabel}. ` +
      `${right.label}: ${rightPct.toFixed(1)} percent, ${ariaRightAmountLabel}.`
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

      <LiveRegion message={ariaSummary} />
    </div>
  );
}
