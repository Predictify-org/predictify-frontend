import React from "react";
import { Telescope } from "lucide-react";

export interface EmptyStateProps {
  /**
   * Title text for the empty state
   */
  title?: string;
  /**
   * Descriptive text explaining why it's empty or what to do
   */
  description?: string;
  /**
   * Text for the call-to-action button
   */
  actionLabel?: string;
  /**
   * Handler for the call-to-action button. If provided, the button will render.
   */
  onAction?: () => void;
  /**
   * Custom icon element
   */
  icon?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Themed EmptyState component designed for the GrantFox FWC26 campaign (Stellar Wave).
 * Displays a helpful illustration and a call-to-action.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No markets found",
  description = "There are no active markets matching your criteria. Explore other stellar opportunities.",
  actionLabel = "Explore Markets",
  onAction,
  icon,
  className = "",
}) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 ${className}`}
      data-testid="empty-state"
    >
      <div className="text-indigo-500 dark:text-indigo-400 mb-4 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full shadow-sm">
        {icon || <Telescope className="w-10 h-10" aria-hidden="true" />}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        {description}
      </p>
      {onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
