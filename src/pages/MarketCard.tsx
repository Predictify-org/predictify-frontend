import React from "react";
import { LiveRegion } from "../components/LiveRegion";
import "../styles/patterns.css";

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

const formatStatusLabel = (status: MarketStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

export const MarketCard: React.FC<MarketCardProps> = ({
  title,
  status,
  category,
  endDate,
  volume,
  onClick,
}) => {
  const patternClass = getStatusPatternClass(status);
  const previousStatusRef = React.useRef<MarketStatus | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  React.useEffect(() => {
    if (previousStatusRef.current && previousStatusRef.current !== status) {
      setAnnouncement(`Market status changed to ${formatStatusLabel(status)}`);
    }
    previousStatusRef.current = status;
  }, [status]);

  return (
    <article
      className="market-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
      onClick={onClick}
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
          {formatStatusLabel(status)}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
        {volume && <span>Volume: {volume}</span>}
        {endDate && <span>Ends: {endDate}</span>}
      </div>

      <LiveRegion message={announcement} data-testid="marketcard-status-live-region" />
    </article>
  );
};

export default MarketCard;
