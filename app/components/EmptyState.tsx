/**
 * EmptyState.tsx – Themed empty state component for when no data is available
 *
 * Displays a helpful message with optional icon, title, description, and CTA.
 * Uses design tokens for dark-mode and theme consistency.
 *
 * WCAG 2.1 AA compliant:
 *   - Semantic HTML with proper heading hierarchy
 *   - Sufficient color contrast via design tokens
 *   - Focus-visible support for CTA buttons
 */

import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** Icon component or emoji to display */
  icon?: React.ReactNode;
  /** Main heading text */
  title: string;
  /** Descriptive text below heading */
  description?: string;
  /** CTA button text */
  ctaLabel?: string;
  /** CTA button handler */
  onCTA?: () => void;
  /** Optional CSS class for custom styling */
  className?: string;
}

/**
 * EmptyState Component
 *
 * @example
 * <EmptyState
 *   icon="??"
 *   title="No trending data yet"
 *   description="Check back soon for trending insights"
 *   ctaLabel="Refresh"
 *   onCTA={() => window.location.reload()}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  onCTA,
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ''}`} role="status">
      {icon && <div className={styles.icon}>{icon}</div>}

      <h2 className={styles.title}>{title}</h2>

      {description && <p className={styles.description}>{description}</p>}

      {ctaLabel && onCTA && (
        <button className={styles.cta} onClick={onCTA} type="button">
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
