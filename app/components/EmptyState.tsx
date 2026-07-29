/**
 * EmptyState.tsx - Themed empty state component for when no data is available
 *
 * Displays a helpful message with optional icon, illustration, title, description, and CTA.
 * Uses design tokens for dark-mode and theme consistency.
 *
 * WCAG 2.1 AA compliant:
 *   - Semantic HTML with proper heading hierarchy
 *   - Sufficient color contrast via design tokens
 *   - Focus-visible support for CTA buttons
 */

import React from 'react';
import Link from 'next/link';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** Icon component or emoji to display */
  icon?: React.ReactNode;
  /** Illustration component (takes precedence over icon if both provided) */
  illustration?: React.ReactNode;
  /** Main heading text */
  title: string;
  /** Descriptive text below heading */
  description?: string;
  /** CTA button text */
  ctaLabel?: string;
  /** CTA button handler */
  onCTA?: () => void;
  /** CTA button href (uses Link instead of button if provided) */
  ctaHref?: string;
  /** Optional CSS class for custom styling */
  className?: string;
}

/**
 * EmptyState Component
 *
 * @example
 * <EmptyState
 *   illustration={<MySvgIllustration />}
 *   title="No trending data yet"
 *   description="Check back soon for trending insights"
 *   ctaLabel="Refresh"
 *   ctaHref="/refresh"
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  illustration,
  title,
  description,
  ctaLabel,
  onCTA,
  ctaHref,
  className,
}) => {
  const renderCTA = () => {
    if (!ctaLabel) return null;

    if (ctaHref) {
      return (
        <Link href={ctaHref} className={styles.cta}>
          {ctaLabel}
        </Link>
      );
    }

    if (onCTA) {
      return (
        <button className={styles.cta} onClick={onCTA} type="button">
          {ctaLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className={`${styles.container} ${className || ''}`} role="status">
      {illustration ? (
        <div className={styles.illustration}>{illustration}</div>
      ) : icon ? (
        <div className={styles.icon}>{icon}</div>
      ) : null}

      <h2 className={styles.title}>{title}</h2>

      {description && <p className={styles.description}>{description}</p>}

      {renderCTA()}
    </div>
  );
};

export default EmptyState;
