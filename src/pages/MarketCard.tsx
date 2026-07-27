import React from "react";
import "../styles/patterns.css";
import "../styles/typography.css";
import { StellarWaveEmptyState } from "../components/EmptyState";

export type MarketStatus = "active" | "closed" | "pending" | "resolved";

export interface MarketCardProps {
  id?: string;
  title?: string;
  status?: MarketStatus;
  category?: string;
  endDate?: string;
  volume?: string;
  onClick?: () => void;
  isEmpty?: boolean;
}

const getStatusPatternClass = (status?: MarketStatus): string => {
  if (!status) return "";
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
  title,
  status,
  category,
  endDate,
  volume,
  onClick,
  isEmpty,
}) => {
  if (isEmpty) {
    return (
      <article className="market-card-empty w-full h-full min-h-[300px]">
        <StellarWaveEmptyState
          title="No markets found"
          description="There are currently no markets available for this category."
          ctaText="Explore All Markets"
          ctaHref="/markets"
        />
      </article>
    );
  }

  const patternClass = getStatusPatternClass(status);

  // Keyboard handler: activate onClick on Enter / Space so the card behaves
  // like a button for keyboard-only users (WCAG 2.1 SC 2.1.1 – Keyboard).
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="market-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow motion-reduce:transition-none motion-reduce:transform-none cursor-pointer bg-white dark:bg-gray-800"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      // Make the article focusable via keyboard when it has an onClick handler.
      // tabIndex={0} is intentionally applied unconditionally so that the card
      // is always reachable in the tab order; consumers that do not pass an
      // onClick still benefit from being inspectable via keyboard navigation.
      tabIndex={0}
      role="button"
      aria-label={`${title || "Market"} – market status: ${status || "unknown"}`}
    >
      <div className="flex justify-between items-center mb-2">
        {category && (
          <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
            {category}
          </span>
        )}
        <span
          className={`status-badge text-xs font-medium px-2.5 py-1 rounded-full border ${patternClass} status-${status || "unknown"}`}
          aria-label={`Market status: ${status || "unknown"}`}
          role="status"
        >
          {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
        {title || "Untitled Market"}
      </h3>

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
        {volume && <span className="tabular-nums">Volume: {volume}</span>}
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </article>
  );
};

export default MarketCard;

export { MarketCardSkeleton } from "../components/Skeleton";
