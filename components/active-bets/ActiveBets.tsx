'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveBetsProps } from '@/lib/types';
import { ActiveBetCard } from './ActiveBetCard';
import { Button } from '@/components/ui/button';

// Skeleton loader component
const ActiveBetCardSkeleton = () => (
  <div className="flex-shrink-0 w-[280px] sm:w-[320px] bg-card/30 border border-border/30 rounded-xl p-4 animate-pulse">
    <div className="relative mb-3">
      <div className="w-full h-20 rounded-lg bg-muted/50" />
      <div className="absolute top-2 left-2 w-16 h-6 bg-muted/50 rounded-md" />
    </div>
    <div className="h-4 bg-muted/50 rounded mb-3" />
    <div className="space-y-1 mb-3">
      <div className="h-3 bg-muted/50 rounded w-3/4" />
      <div className="h-3 bg-muted/50 rounded w-2/3" />
    </div>
    <div className="space-y-2">
      <div className="w-full h-1.5 bg-muted/50 rounded-full" />
      <div className="h-3 bg-muted/50 rounded w-1/4 ml-auto" />
    </div>
  </div>
);

// Empty state component
const EmptyState = ({ onAddBet }: { onAddBet?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
      <Plus className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Bets</h3>
    <p className="text-muted-foreground mb-4 max-w-sm">
      You don't have any active bets at the moment. Start by placing your first bet!
    </p>
    {onAddBet && (
      <Button onClick={onAddBet} className="bg-primary hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-2" />
        Add Bet
      </Button>
    )}
  </div>
);

export const ActiveBets: React.FC<ActiveBetsProps> = ({
  bets,
  isLoading = false,
  onAddBet,
  onLearnMore
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position and update arrow states
  const updateScrollState = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll by viewport width
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth;
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && canScrollLeft) {
      e.preventDefault();
      scroll('left');
    } else if (e.key === 'ArrowRight' && canScrollRight) {
      e.preventDefault();
      scroll('right');
    }
  };

  // Update scroll state on mount and scroll
  useEffect(() => {
    updateScrollState();
  }, [bets]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Active Bets</h2>
          <div className="flex gap-2">
            <div className="w-20 h-9 bg-muted/50 rounded-md animate-pulse" />
            <div className="w-24 h-9 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Skeleton Cards */}
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <ActiveBetCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (!bets || bets.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Active Bets</h2>
          <div className="flex gap-2">
            {onAddBet && (
              <Button onClick={onAddBet} size="sm" className="bg-primary hover:bg-primary/90">
                Add Bet
              </Button>
            )}
            {onLearnMore && (
              <Button onClick={onLearnMore} variant="outline" size="sm">
                Learn more
              </Button>
            )}
          </div>
        </div>
        <EmptyState onAddBet={onAddBet} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Active Bets</h2>
        <div className="flex gap-2">
          {onAddBet && (
            <Button onClick={onAddBet} size="sm" className="bg-primary hover:bg-primary/90">
              Add Bet
            </Button>
          )}
          {onLearnMore && (
            <Button onClick={onLearnMore} variant="outline" size="sm">
              Learn more
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background/90"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background/90"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Cards Container */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide',
            'snap-x snap-mandatory',
            'scroll-smooth',
            'pb-2', // Add padding for focus outline
            // Responsive padding
            'px-1 sm:px-0'
          )}
          onScroll={updateScrollState}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Active bets carousel"
        >
          {bets.map((bet) => (
            <div key={bet.id} className="snap-start">
              <ActiveBetCard bet={bet} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
