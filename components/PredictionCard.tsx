// src/components/PredictionCard.tsx
import React from 'react';
import { Prediction, PredictionStatus } from '../types/predictions';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { OutcomeIcon } from '@/components/icons/OutcomeIcons';
import type { OutcomeVariant } from '@/components/icons/OutcomeIcons';
import { getCategoryEmojiUrl } from '@/lib/categories/emojiMap';
import { Skeleton } from '@/components/ui/skeleton';

interface PredictionCardProps {
  /** The prediction data to display. When omitted, a themed skeleton is rendered. */
  prediction?: Prediction;
}

// Map status to semantic colors and icons
const statusMap: Record<PredictionStatus, { icon: React.ElementType; label: string; className: string }> = {
  won: { icon: CheckCircle2, label: 'Won', className: 'text-green-600 dark:text-green-500 border-green-600/20 bg-green-50/50 dark:bg-green-500/10' },
  lost: { icon: XCircle, label: 'Lost', className: 'text-red-600 dark:text-red-500 border-red-600/20 bg-red-50/50 dark:bg-red-500/10' },
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-600 dark:text-yellow-500 border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-500/10' },
  active: { icon: Activity, label: 'Active', className: 'text-blue-600 dark:text-blue-500 border-blue-600/20 bg-blue-50/50 dark:bg-blue-500/10' },
};

/**
 * Maps a PredictionStatus to a shape-based OutcomeVariant so that status
 * differentiation does not rely on color alone (WCAG 2.1 AA 1.4.1).
 *
 * Shape → Status mapping:
 *   ▲ positive (TriangleUp)   → won
 *   ▽ negative (TriangleDown) → lost
 *   ◇ neutral  (Diamond)      → pending / active
 *
 * See app/design-system/tokens.md for the full palette + icon mapping.
 */
const statusOutcomeVariant: Record<PredictionStatus, OutcomeVariant> = {
  won: 'positive',
  lost: 'negative',
  pending: 'neutral',
  active: 'neutral',
};

/**
 * Skeleton placeholder that matches the exact shape of PredictionCard.
 * Uses design-token-aware Skeleton primitives for automatic dark-mode
 * and theme consistency. Intended for async hydration states.
 */
export const PredictionCardSkeleton: React.FC = () => (
  <div
    className="w-full text-left bg-card p-4 rounded-xl border border-border"
    aria-busy="true"
    data-testid="prediction-card-skeleton"
  >
    {/* Header: Title + Status Badge */}
    <div className="flex justify-between items-start mb-3">
      <Skeleton className="h-5 w-3/5 rounded" />
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </div>

    {/* Description (two lines) */}
    <div className="space-y-1.5 mb-4">
      <Skeleton className="h-3.5 w-full rounded" />
      <Skeleton className="h-3.5 w-4/5 rounded" />
    </div>

    {/* Grid: Stake | Odds */}
    {/*        Pot.Win | Event Date */}
    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
      <div className="space-y-1">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-10 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      {/* Resolved date row (always shown in skeleton to match potential shape) */}
      <div className="col-span-2 space-y-1 mt-0.5">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    </div>
  </div>
);

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const { title, description, stakeAmount, stakeToken, odds, potentialWinnings, winningsToken, eventDate, resolvedDate, status, category, outcome } = prediction;
  // Render themed skeleton when data is not yet available (async hydration)
  if (!prediction) {
    return <PredictionCardSkeleton />;
  }

  const { title, description, stakeAmount, stakeToken, odds, potentialWinnings, winningsToken, eventDate, resolvedDate, status } = prediction;
  const { icon: Icon, className, label } = statusMap[status];
  const [isOddsExpanded, setIsOddsExpanded] = React.useState(false);

  return (
    <button className="w-full text-left bg-card p-4 rounded-xl shadow-lg hover:bg-muted/50 transition duration-200 cursor-pointer border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col items-start gap-1 pr-2">
          <h3 className="text-lg font-semibold text-card-foreground line-clamp-2">{title}</h3>
          {outcome && (
            <Badge 
              variant="outline" 
              className={`gap-1.5 ${
                outcome === 'Yes' 
                  ? 'bg-outcome-yes/10 text-outcome-yes border-outcome-yes/20 dark:bg-outcome-yes/20 dark:border-outcome-yes/30' 
                  : 'bg-outcome-no/10 text-outcome-no border-outcome-no/20 dark:bg-outcome-no/20 dark:border-outcome-no/30'
              }`}
            >
              <img 
                src={getCategoryEmojiUrl(category)} 
                alt="" 
                className="w-3.5 h-3.5" 
                aria-hidden="true" 
              />
              {outcome}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className={`gap-1.5 shrink-0 ${className}`} aria-label={`Status: ${label}`}>
          {/*
           * Shape icon (color-blind safe) — rendered BEFORE the status icon.
           * aria-hidden because the Badge's aria-label already names the status.
           * Distinguishable by shape under Deuteranopia & Tritanopia simulations.
           */}
          <OutcomeIcon
            variant={statusOutcomeVariant[status]}
            aria-hidden
          />
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm mb-4 truncate-lines-2">{description}</p>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        {/* Stake */}
        <div>
          <p className="text-muted-foreground">Stake</p>
          <p className="text-card-foreground font-medium">{stakeAmount} {stakeToken}</p>
        </div>

        {/* Odds */}
        <Collapsible open={isOddsExpanded} onOpenChange={setIsOddsExpanded}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between p-2 rounded hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={isOddsExpanded}
              aria-controls="odds-breakdown"
            >
              <p className="text-muted-foreground">Odds</p>
              <p className="text-card-foreground font-medium">{odds.toFixed(1)}x</p>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent id="odds-breakdown" className="mt-2 text-sm text-muted-foreground">
            <p>Implied probability: {(1 / odds * 100).toFixed(1)}%</p>
            <p>Last move: N/A</p>
            <p>24h volume: N/A</p>
          </CollapsibleContent>
        </Collapsible>

        {/* Potential Winnings */}
        <div>
          <p className="text-muted-foreground">Potential Winnings</p>
          <p className="text-card-foreground font-medium">{potentialWinnings} {winningsToken}</p>
        </div>

        {/* Event Date */}
        <div>
          <p className="text-muted-foreground">Event Date</p>
          <p className="text-card-foreground font-medium">{eventDate}</p>
        </div>
        
        {/* Resolved Date (Conditionally rendered) */}
        {(status === 'won' || status === 'lost') && (
          <div className='col-span-2'>
            <p className="text-muted-foreground">Resolved</p>
            <p className="text-card-foreground font-medium">{resolvedDate}</p>
          </div>
        )}
      </div>
    </button>
  );
};

export default PredictionCard;
