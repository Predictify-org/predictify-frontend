import React from "react";
import "../styles/patterns.css";
import "../styles/focus.css";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";

export type MarketStatus = "active" | "closed" | "pending" | "resolved";

export interface MarketCardProps {
  id?: string;
  title?: string;
  status?: MarketStatus;
  category?: string;
  endDate?: string;
  volume?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  onClick?: () => void;
}

const getStatusPatternClass = (status: MarketStatus): string => {
  switch (status.toLowerCase()) {
    case "active":
      return "status-pattern-active";
    case "closed":
      return "status-pattern-closed";
    case "pending":
      return "status-pattern-pending";
    case "resolved":
      return "status-pattern-resolved";
    default:
      return "";
  }
};

/**
 * MarketCard (src/pages)
 *
 * A lightweight market summary card showing category, status badge,
 * title, volume, and end date.
 *
 * ## Responsive layout
 * - **≥ sm (640 px):** category and status badge sit side-by-side
 *   (`flex-row justify-between`). Volume and end-date also side-by-side.
 * - **< sm (mobile):** the header row switches to `flex-col` so the badge
 *   never overflows when a long category label is present. `flex-wrap` on
 *   the meta row lets pool and date stack when the card is narrow.
 *   `min-w-0` + `truncate` on the category prevent text overflow.
 *
 * ## Accessibility
 * - The status badge keeps its `role="status"` and `aria-label` on all
 *   breakpoints for screen-reader compatibility.
 * - WCAG 2.1 AA contrast is preserved; dark-mode pattern fills are defined
 *   in `patterns.css`.
 */
export const MarketCard: React.FC<MarketCardProps> = ({
  title = "",
  status = "pending",
  category,
  endDate,
  volume,
  isLoading = false,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  onEmptyAction,
  onClick,
}) => {
  if (isLoading) {
    return (
      <article
        data-testid="market-card-skeleton"
        className="market-card border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800"
      >
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-3" />
        <div className="flex justify-between items-center text-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </article>
    );
  }

  if (isEmpty) {
    return (
      <article className="market-card h-full h-min-[200px]">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          onAction={onEmptyAction}
        />
      </article>
    );
  }

  const patternClass = getStatusPatternClass(status);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <article
      className="market-card market-card-focus border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      {/*
       * Header row: category label + status badge
       * ------------------------------------------
       * Mobile  (<sm): flex-col so a long category label and the badge never
       *   fight for horizontal space; the badge aligns to the start.
       * Desktop (≥sm): flex-row justify-between — the original side-by-side
       *   layout is restored.
       *
       * `min-w-0` + `truncate` on the category keep overflow tidy when the
       * card width is very narrow.
       */}
      <div className="flex flex-col gap-1 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        {category && (
          <span
            className="min-w-0 truncate text-xs uppercase font-semibold text-gray-500 dark:text-gray-400"
            title={category}
          >
            {category}
          </span>
        )}
        <span
          className={`self-start status-badge text-xs font-medium px-2.5 py-1 rounded-full border ${patternClass} status-${status}`}
          aria-label={`Market status: ${status}`}
          role="status"
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      {/*
       * Meta row: volume + end date
       * ----------------------------
       * `flex-wrap` lets the two items wrap to a second line on very narrow
       * viewports instead of overflowing. `gap-x-4 gap-y-1` maintains
       * comfortable spacing in both orientations.
       */}
      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
        {volume && <span>Volume: {volume}</span>}
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </article>
  );
};

export default MarketCard;
