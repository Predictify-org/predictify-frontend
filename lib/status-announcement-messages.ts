/**
 * Status Announcement Messages
 *
 * Provides human-readable, accessible announcements for market and bet status changes.
 * All messages are designed to be clear and concise for screen reader users.
 *
 * Invariants:
 * - All market status messages follow the pattern: "Market [title] is now [status]"
 * - All bet status messages follow the pattern: "Your bet on [title] is now [status]"
 * - No sensitive data (amounts, wallet addresses) in messages
 * - Messages are localization-ready (no hardcoded HTML/formatting)
 */

export type MarketStatus = "open" | "closing_soon" | "closed" | "resolved" | "cancelled";
export type BetStatus = "active" | "pending" | "completed" | "cancelled";

/**
 * Market status change announcements
 * Maps each status to the human-readable message for screen readers
 */
export const MARKET_STATUS_MESSAGES: Record<MarketStatus, string> = {
  open: "Market is now open for predictions",
  closing_soon: "Market is closing soon. Place your prediction now",
  closed: "Market is now closed for new predictions",
  resolved: "Market has been resolved",
  cancelled: "Market has been cancelled and stakes have been refunded",
};

/**
 * Bet status change announcements
 * Maps each status to the human-readable message for screen readers
 */
export const BET_STATUS_MESSAGES: Record<BetStatus, string> = {
  active: "Your bet is now active",
  pending: "Your bet is pending",
  completed: "Your bet is complete",
  cancelled: "Your bet has been cancelled",
};

/**
 * Get announcement message for market status change
 * Includes context-specific details for better user experience
 *
 * @param status - New market status
 * @param marketTitle - Optional market title for context
 * @returns Human-readable announcement message
 *
 * @example
 * getMarketStatusMessage("closed", "Will Bitcoin reach $100k?")
 * // → "Market 'Will Bitcoin reach $100k?' is now closed for new predictions"
 */
export function getMarketStatusMessage(status: MarketStatus, marketTitle?: string): string {
  const baseMessage = MARKET_STATUS_MESSAGES[status];

  if (!marketTitle) {
    return baseMessage;
  }

  // Prepend market title for additional context
  return `Market "${marketTitle}" ${baseMessage.toLowerCase()}`;
}

/**
 * Get announcement message for bet status change
 * Includes context-specific details for better user experience
 *
 * @param status - New bet status
 * @param marketTitle - Optional market title for context
 * @returns Human-readable announcement message
 *
 * @example
 * getBetStatusMessage("completed", "Will Bitcoin reach $100k?")
 * // → "Your bet on 'Will Bitcoin reach $100k?' is now complete"
 */
export function getBetStatusMessage(status: BetStatus, marketTitle?: string): string {
  const baseMessage = BET_STATUS_MESSAGES[status];

  if (!marketTitle) {
    return baseMessage;
  }

  // Inject market title for additional context
  return `Your bet on "${marketTitle}" ${baseMessage.toLowerCase()}`;
}

/**
 * Get announcement priority level based on status
 * WCAG 2.1: Use "assertive" for time-sensitive announcements
 *
 * @param status - Market or bet status
 * @returns Priority level for aria-live
 *
 * Invariant: Time-critical statuses (resolved, completed, cancelled) are "assertive"
 * to ensure screen readers prioritize them over other announcements
 */
export function getStatusAnnouncementPriority(
  status: MarketStatus | BetStatus,
): "polite" | "assertive" {
  // Time-critical statuses deserve higher priority
  const assertiveStatuses = ["resolved", "completed", "cancelled"] as const;
  return assertiveStatuses.includes(status as never) ? "assertive" : "polite";
}

/**
 * Validate that a market status transition is allowed
 *
 * Valid transitions:
 * - open → closing_soon → closed → resolved
 * - Any status → cancelled
 *
 * @param from - Current market status
 * @param to - New market status
 * @returns true if transition is valid, false otherwise
 *
 * Invariant: Only explicitly defined transitions are allowed
 */
export function isValidMarketTransition(from: MarketStatus, to: MarketStatus): boolean {
  if (from === to) return false; // Same status, not a transition
  if (to === "cancelled") return true; // Can always cancel

  const validTransitions: Record<MarketStatus, MarketStatus[]> = {
    open: ["closing_soon", "cancelled"],
    closing_soon: ["closed", "cancelled"],
    closed: ["resolved", "cancelled"],
    resolved: [],
    cancelled: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Validate that a bet status transition is allowed
 *
 * Valid transitions:
 * - active → pending, completed, cancelled
 * - pending → active, completed, cancelled
 * - completed and cancelled are terminal states
 *
 * @param from - Current bet status
 * @param to - New bet status
 * @returns true if transition is valid, false otherwise
 *
 * Invariant: Only explicitly defined transitions are allowed
 */
export function isValidBetTransition(from: BetStatus, to: BetStatus): boolean {
  if (from === to) return false; // Same status, not a transition
  if (to === "cancelled") return true; // Can always cancel

  const validTransitions: Record<BetStatus, BetStatus[]> = {
    active: ["pending", "completed"],
    pending: ["active", "completed"],
    completed: [],
    cancelled: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}
