'use client';

import React from 'react';
import { Clock, TrendingUp, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Market status values representing the lifecycle of a prediction market.
 *
 * Transitions:
 *   OPEN → CLOSING_SOON → CLOSED → RESOLVED
 *   Any status → CANCELLED (at any point)
 */
export type MarketStatus = 'open' | 'closing_soon' | 'closed' | 'resolved' | 'cancelled';

interface StatusBadgeProps {
  /** The current market status */
  status: MarketStatus;
  /** Optional CSS class for additional styling */
  className?: string;
  /** Whether to show tooltip on hover (default: true) */
  showTooltip?: boolean;
}

/**
 * Maps each market status to an icon component
 */
const STATUS_ICONS: Record<MarketStatus, React.ElementType> = {
  open: TrendingUp,
  closing_soon: Clock,
  closed: Lock,
  resolved: CheckCircle2,
  cancelled: AlertCircle,
};

/**
 * Maps each market status to a display label
 */
const STATUS_LABELS: Record<MarketStatus, string> = {
  open: 'Open',
  closing_soon: 'Closing Soon',
  closed: 'Closed',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

/**
 * Maps each market status to a human-readable tooltip description
 * explaining what the status means and any transitions involved
 */
const STATUS_DESCRIPTIONS: Record<MarketStatus, string> = {
  open: 'Market is accepting predictions. You can place or modify your prediction at any time while the market remains open.',
  closing_soon: 'Market closes in under 1 hour. Place or finalize your prediction now before predictions are locked.',
  closed: 'Predictions are locked. No new predictions or modifications are allowed. The market is awaiting resolution.',
  resolved: 'Market has been resolved with an outcome. All predictions have been settled and payouts have been distributed.',
  cancelled: 'Market was cancelled. All stakes have been refunded to their original owners. No predictions were settled.',
};

/**
 * Maps each market status to a Badge variant for semantic styling
 */
const STATUS_VARIANTS: Record<MarketStatus, 'info' | 'warning' | 'danger' | 'success' | 'neutral'> = {
  open: 'success',
  closing_soon: 'warning',
  closed: 'info',
  resolved: 'success',
  cancelled: 'danger',
};

/**
 * Maps each market status to a color-blind-safe pattern overlay that
 * supplements the status color so the label remains distinguishable without
 * relying on hue alone.
 */
const STATUS_PATTERN_CLASSES: Record<MarketStatus, string> = {
  open: 'pattern-diagonal',
  closing_soon: 'pattern-dots',
  closed: 'pattern-crosshatch',
  resolved: 'pattern-horizontal',
  cancelled: 'pattern-vertical',
};

/**
 * StatusBadge component for displaying market status transitions with live tooltips.
 *
 * Features:
 * - Displays current market status with appropriate icon and color
 * - Live tooltip showing status meaning and any transition information
 * - Full screen reader support via sr-only text and ARIA attributes
 * - Keyboard accessible (visible on focus as well as hover)
 * - Responsive design that works on small screens
 * - Dark mode support using Tailwind class-based strategy
 *
 * Accessibility (WCAG 2.1 AA):
 * - Uses role="status" to announce status changes to screen readers
 * - Includes aria-describedby linking to the sr-only description
 * - SR-only text contains full tooltip description for accessibility
 * - Keyboard accessible via focus (Radix Tooltip handles this)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatusBadge status="open" />
 *
 * // With custom styling
 * <StatusBadge status="closing_soon" className="mr-2" />
 *
 * // Without tooltip
 * <StatusBadge status="resolved" showTooltip={false} />
 * ```
 */
export function StatusBadge({
  status,
  className,
  showTooltip = true,
}: StatusBadgeProps): JSX.Element {
  const Icon = STATUS_ICONS[status];
  const label = STATUS_LABELS[status];
  const description = STATUS_DESCRIPTIONS[status];
  const variant = STATUS_VARIANTS[status];
  const patternClass = STATUS_PATTERN_CLASSES[status] ?? 'pattern-diagonal';

  const statusId = `status-description-${status}-${Math.random().toString(36).substr(2, 9)}`;

  const badge = (
    <Badge
      role="status"
      aria-describedby={statusId}
      variant={variant}
      size="md"
      className={cn('relative gap-1.5 overflow-hidden', patternClass, className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      {/* SR-only description for screen readers */}
      <span id={statusId} className="sr-only">
        {description}
      </span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            <p className="text-popover-foreground/90">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default StatusBadge;
