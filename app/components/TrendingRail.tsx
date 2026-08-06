/**
 * TrendingRail.tsx – Displays trending insights with optimistic UI on primary action
 *
 * Shows a curated list of trending items, with:
 *   - Loading skeleton while fetching
 *   - Optimistic UI on refresh (preserves current data, shows spinner badge)
 *   - Revert on failure: shows error banner while keeping stale data visible
 *   - Empty state with CTA when no data available
 *   - Responsive grid layout with WCAG 2.1 AA compliance
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<TrendingItem[]>([]);

  const fetchTrendingData = useCallback(async (isRetry: boolean = false) => {
    // Determine if this is an optimistic refresh (data already exists)
    const hasData = dataRef.current.length > 0;
    const isRefreshing = hasData && !isRetry;

    if (isRefreshing) {
      setIsOptimistic(true);
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending data');
      const data = await response.json();
      dataRef.current = data;
      setTrendingData(data);
      setIsOptimistic(false);
    } catch (err) {
      if (isRefreshing && dataRef.current.length > 0) {
        // Optimistic revert: restore previous data, show error banner
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Failed to refresh'));
        setIsOptimistic(false);
      } else {
        // Initial load failure
        dataRef.current = [];
        setTrendingData([]);
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial loading state (no data yet)
  if (isLoading && !isOptimistic && trendingData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSkeleton} aria-busy="true" role="status">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    );
  }

  // Error state – no data to show
  if (isError && trendingData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner} role="alert">
          <p>Failed to load trending data. {error?.message}</p>
          <button
            onClick={() => fetchTrendingData(true)}
            disabled={isLoading}
            className={styles.primaryAction}
          >
            {isLoading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
            {isLoading ? 'Retrying...' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  // Empty state – no trending data
  if (trendingData.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon="📊"
          title="No trending data yet"
          description="Check back soon for trending insights from across the network"
          ctaLabel={isLoading ? 'Refreshing...' : 'Refresh'}
          onCTA={() => fetchTrendingData(true)}
          className={styles.emptyState}
        />
      </div>
    );
  }

  // Render trending items (with optimistic UI during refresh)
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Trending</h2>
        {isOptimistic && (
          <span className={styles.refreshingBadge} aria-live="polite">
            <span className={styles.spinnerSmall} aria-hidden="true" />
            Refreshing...
          </span>
        )}
        {isError && (
          <span className={styles.errorBadge} role="alert">
            Update failed
          </span>
        )}
      </div>
      <div className={styles.grid}>
        {trendingData.map((item) => (
          <div
            key={item.id}
            className={`${styles.card} ${styles[`trend-${item.trend}`]}${
              isOptimistic ? ` ${styles.optimistic}` : ''
            }`}
          >
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.value}>{item.value.toFixed(2)}</p>
            <span
              className={`${styles.change} ${styles[`change-${item.trend}`]}`}
            >
              {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {isError && (
        <div className={styles.errorInline} role="alert">
          <p>Failed to refresh. {error?.message}</p>
          <button
            onClick={() => fetchTrendingData(true)}
            disabled={isLoading}
            className={styles.retryLink}
          >
            {isLoading ? 'Retrying...' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendingRail;