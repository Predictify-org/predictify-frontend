/**
 * TrendingRail.tsx - Displays trending insights with empty state fallback.
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

  const fetchTrendingData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending data');
      const data = (await response.json()) as TrendingItem[];
      setTrendingData(data);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrendingData();
  }, [fetchTrendingData]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSkeleton} aria-busy="true">
          {[...Array(3)].map((_, index) => (
            <div key={index} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    );
  }

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

  if (trendingData.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon="?"
          title="No trending data yet"
          description="Check back soon for trending insights from across the network"
          ctaLabel="Refresh"
          onCTA={fetchTrendingData}
          className={styles.emptyState}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Trending</h2>
      <div className={styles.grid}>
        {trendingData.map((item) => (
          <div key={item.id} className={`${styles.card} ${styles[`trend-${item.trend}`]}`}>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.value}>{item.value.toFixed(2)}</p>
            <span className={`${styles.change} ${styles[`change-${item.trend}`]}`}>
              {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingRail;
