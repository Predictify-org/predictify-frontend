import React from "react";
import "../styles/patterns.css";
import "../styles/typography.css";

export type MarketStatus = "active" | "closed" | "pending" | "resolved";

export interface MarketCardProps {
  id: string;
  title: string;
  status: MarketStatus;
  category?: string;
  endDate?: string;
  volume?: string;
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
  title,
  status,
  category,
  endDate,
  volume,
  onClick,
}) => {
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
      className="market-card border border-border rounded-lg bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none cursor-pointer"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      // Make the article focusable via keyboard when it has an onClick handler.
      // tabIndex={0} is intentionally applied unconditionally so that the card
      // is always reachable in the tab order; consumers that do not pass an
      // onClick still benefit from being inspectable via keyboard navigation.
      tabIndex={0}
      role="button"
      aria-label={`${title} – market status: ${status}`}
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {category && (
          <span
            className="min-w-0 truncate text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            title={category}
          >
            {category}
          </span>
        )}
        <span
          className={`status-badge inline-flex items-center self-start rounded-full border px-2.5 py-1 text-caption font-medium ${patternClass} status-${status}`}
          aria-label={`Market status: ${status}`}
          role="status"
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <h3 className="mb-3 text-h6 font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-muted-foreground">
        {volume && <span className="tabular-nums">Volume: {volume}</span>}
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </article>
  );
};

export default MarketCard;

export { MarketCardSkeleton } from "../components/Skeleton";
