/**
 * TrendingRail.tsx – Displays trending insights with empty state fallback
 *
 * Shows a curated list of trending items, with:
 *   - Loading skeleton while fetching
 *   - Error banner on failures
 *   - Empty state with CTA when no data available
 *   - Responsive grid layout with WCAG 2.1 AA compliance
 *   - Optimistic UI on primary action (click) with revert on failure
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from './EmptyState';
import styles from './TrendingRail.module.css';

interface TrendingItem {
  id: string;
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export const TrendingRail: React.FC = () => {
  const [trendingData, setTrendingData] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Optimistic UI state
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTrendingData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending data');
      const data = await response.json();
      setTrendingData(data);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingData();
  }, [fetchTrendingData]);

  /**
   * Handles the primary action on a trending item with optimistic UI.
   *
   * 1. Immediately updates the UI (shows optimistic state)
   * 2. Performs the API call in the background
   * 3. On success, clears the optimistic state
   * 4. On failure, reverts the optimistic state and shows the error
   */
  const handlePrimaryAction = useCallback(async (item: TrendingItem) => {
    // Clear any previous action error
    setActionError(null);

    // Step 1: Optimistic update — immediately show the card as "active"
    setOptimisticId(item.id);

    try {
      // Step 2: Simulate the API call (e.g., follow/bookmark the trending item)
      const response = await fetch('/api/trending/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action: 'select' }),
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${response.statusText}`);
      }

      // Step 3: Success — clear optimistic state after a brief delay
      // so the user can see the positive feedback
      await new Promise((resolve) => setTimeout(resolve, 300));
      setOptimisticId(null);
    } catch (err) {
      // Step 4: Failure — revert the optimistic state and show error
      setOptimisticId(null);
      const message = err instanceof Error ? err.message : 'Action failed';
      setActionError(message);

      // Auto-dismiss the error after 3 seconds
      setTimeout(() => setActionError(null), 3000);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSkeleton} aria-busy="true">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner} role="alert">
          <p>Failed to load trending data. {error?.message}</p>
          <button onClick={fetchTrendingData}>Try again</button>
        </div>
      </div>
    );
  }

  // Empty state – no trending data
  if (trendingData.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon="??"
          title="No trending data yet"
          description="Check back soon for trending insights from across the network"
          ctaLabel="Refresh"
          onCTA={fetchTrendingData}
          className={styles.emptyState}
        />
      </div>
    );
  }

  // Render trending items
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Trending</h2>

      {/* Action error toast */}
      {actionError && (
        <div className={styles.actionErrorToast} role="alert">
          <span className={styles.actionErrorIcon} aria-hidden="true">&#9888;</span>
          <span>{actionError}</span>
        </div>
      )}

      <div className={styles.grid}>
        {trendingData.map((item) => {
          const isOptimistic = optimisticId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`
                ${styles.card}
                ${styles[`trend-${item.trend}`]}
                ${isOptimistic ? styles.cardOptimistic : ''}
                ${styles.cardClickable}
              `}
              onClick={() => handlePrimaryAction(item)}
              disabled={optimisticId !== null && !isOptimistic}
              aria-label={`View ${item.title} — $${item.value.toFixed(2)} — ${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}%`}
              aria-pressed={isOptimistic}
            >
              {isOptimistic && (
                <span className={styles.optimisticSpinner} aria-hidden="true" />
              )}
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.value}>{item.value.toFixed(2)}</p>
              <span
                className={`${styles.change} ${styles[`change-${item.trend}`]}`}
              >
                {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingRail;