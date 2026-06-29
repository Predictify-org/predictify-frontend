// src/components/PredictionCard.tsx
import React from 'react';
import { Prediction, PredictionStatus } from '../types/predictions';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { OutcomeIcon } from '@/components/icons/OutcomeIcons';
import type { OutcomeVariant } from '@/components/icons/OutcomeIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface PredictionCardProps {
  prediction?: Prediction;
  isLoading?: boolean;
}

// Map status to semantic colors and icons
const statusMap: Record<PredictionStatus, { icon: React.ElementType; label: string; className: string }> = {
  won: { icon: CheckCircle2, label: 'Won', className: 'text-green-600 dark:text-green-500 border-green-600/20 bg-green-50/50 dark:bg-green-500/10' },
  lost: { icon: XCircle, label: 'Lost', className: 'text-red-600 dark:text-red-500 border-red-600/20 bg-red-50/50 dark:bg-red-500/10' },
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-600 dark:text-yellow-500 border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-500/10' },
  active: { icon: Activity, label: 'Active', className: 'text-blue-600 dark:text-blue-500 border-blue-600/20 bg-blue-50/50 dark:bg-blue-500/10' },
};

const statusOutcomeVariant: Record<PredictionStatus, OutcomeVariant> = {
  won: 'positive',
  lost: 'negative',
  pending: 'neutral',
  active: 'neutral',
};

const PredictionCardSkeleton = () => (
  <div className="w-full text-left bg-card p-4 space-y-3">
    <div className="flex justify-between items-start mb-3">
      {/* Title (2-line skeleton) */}
      <div className="space-y-2 flex-1 pr-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      {/* Badge skeleton */}
      <Skeleton className="h-6 w-20 rounded-full shrink-0" />
    </div>

    {/* Description (2-line skeleton) */}
    <div className="space-y-2 mb-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>

    {/* Grid of Stake, Odds, Potential Winnings, Event Date */}
    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
      <div>
        <Skeleton className="h-3 w-12 mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div>
        <Skeleton className="h-3 w-10 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div>
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div>
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, isLoading = false }) => {
  const reducedMotion = useReducedMotion();
  const [isOddsExpanded, setIsOddsExpanded] = React.useState(false);

  // Safe fallback properties
  const title = prediction?.title || '';
  const description = prediction?.description || '';
  const stakeAmount = prediction?.stakeAmount || 0;
  const stakeToken = prediction?.stakeToken || '';
  const odds = prediction?.odds || 1.0;
  const potentialWinnings = prediction?.potentialWinnings || 0;
  const winningsToken = prediction?.winningsToken || '';
  const eventDate = prediction?.eventDate || '';
  const resolvedDate = prediction?.resolvedDate;
  const status = prediction?.status || 'active';

  const { icon: Icon, className, label } = statusMap[status];

  return (
    <div 
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      data-state={isLoading ? "loading" : "loaded"}
    >
      {/* Skeleton Overlay */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-300 ease-in-out z-10 pointer-events-none bg-card",
          isLoading ? "opacity-100" : "opacity-0"
        )}
      >
        <PredictionCardSkeleton />
      </div>

      {/* Content Container */}
      <button 
        disabled={isLoading}
        className={cn(
          "w-full text-left bg-card p-4 hover:bg-muted/50 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          reducedMotion ? "" : "transform",
          isLoading 
            ? "opacity-0 translate-y-1 pointer-events-none" 
            : "opacity-100 translate-y-0"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-card-foreground line-clamp-2 pr-2">{title}</h3>
          <Badge variant="outline" className={`gap-1.5 shrink-0 ${className}`} aria-label={`Status: ${label}`}>
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
                disabled={isLoading}
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
          {(status === 'won' || status === 'lost') && resolvedDate && (
            <div className='col-span-2'>
              <p className="text-muted-foreground">Resolved</p>
              <p className="text-card-foreground font-medium">{resolvedDate}</p>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default PredictionCard;
