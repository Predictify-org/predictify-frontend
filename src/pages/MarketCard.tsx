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
      <div className="flex justify-between items-center mb-2">
        {category && (
          <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
            {category}
          </span>
        )}
        <span
          className={`status-badge text-xs font-medium px-2.5 py-1 rounded-full border ${patternClass} status-${status}`}
          aria-label={`Market status: ${status}`}
          role="status"
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
        {volume && <span>Volume: {volume}</span>}
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </article>
  );
};

export default MarketCard;
