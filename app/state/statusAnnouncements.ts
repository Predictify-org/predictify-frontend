/**
 * Status Announcement Store
 *
 * Manages market and bet status announcements with deterministic state transitions.
 * Ensures:
 * - All status transitions are validated
 * - Concurrent updates don't produce inconsistent state
 * - Failed announcements can be retried
 * - Duplicate announcements are deduplicated
 *
 * Invariants:
 * - Market status can only transition in valid sequences
 * - Bet status can only transition in valid sequences
 * - Each entity (market or bet) has exactly one current status
 * - Announcement attempts are logged for observability
 */

import { create } from "zustand";

import {
  MarketStatus,
  BetStatus,
  isValidMarketTransition,
  isValidBetTransition,
  getStatusAnnouncementPriority,
} from "@/lib/status-announcement-messages";

/**
 * Status entry tracking current status and last announcement time
 * Used to deduplicate announcements for the same status
 */
interface StatusEntry {
  status: MarketStatus | BetStatus;
  lastAnnouncedAt: number; // milliseconds since epoch
}

interface StatusAnnouncementState {
  /**
   * Market ID → current market status
   * Invariant: Only contains markets with tracked status changes
   */
  marketStatuses: Map<string, StatusEntry>;

  /**
   * Bet ID → current bet status
   * Invariant: Only contains bets with tracked status changes
   */
  betStatuses: Map<string, StatusEntry>;

  /**
   * Attempt to announce a market status change
   * Returns true if announcement was queued, false if transition invalid
   *
   * @param marketId - Unique market identifier
   * @param newStatus - Target market status
   * @returns Object with success flag and optional error message
   *
   * Invariants enforced:
   * - Status transition must be valid (calls isValidMarketTransition)
   * - Doesn't prevent state update if already at target status (idempotent tracking)
   * - Logs all attempts (success and failure) for observability
   */
  announceMarketStatusChange: (
    marketId: string,
    newStatus: MarketStatus,
  ) => {
    success: boolean;
    error?: string;
    shouldAnnounce: boolean;
    priority: "polite" | "assertive";
  };

  /**
   * Attempt to announce a bet status change
   * Returns true if announcement was queued, false if transition invalid
   *
   * @param betId - Unique bet identifier
   * @param newStatus - Target bet status
   * @returns Object with success flag and optional error message
   *
   * Invariants enforced:
   * - Status transition must be valid (calls isValidBetTransition)
   * - Doesn't prevent state update if already at target status (idempotent tracking)
   * - Logs all attempts (success and failure) for observability
   */
  announceBetStatusChange: (
    betId: string,
    newStatus: BetStatus,
  ) => {
    success: boolean;
    error?: string;
    shouldAnnounce: boolean;
    priority: "polite" | "assertive";
  };

  /**
   * Get current status of a market
   * @returns Current status or undefined if not tracked
   */
  getMarketStatus: (marketId: string) => MarketStatus | undefined;

  /**
   * Get current status of a bet
   * @returns Current status or undefined if not tracked
   */
  getBetStatus: (betId: string) => BetStatus | undefined;

  /**
   * Clear all tracked statuses (for testing)
   * @internal
   */
  reset: () => void;
}

// Minimum time between duplicate announcements (ms)
const DEDUPLICATION_WINDOW = 2000;

export const useStatusAnnouncementStore = create<StatusAnnouncementState>((set, get) => ({
  marketStatuses: new Map(),
  betStatuses: new Map(),

  announceMarketStatusChange: (marketId: string, newStatus: MarketStatus) => {
    const currentEntry = get().marketStatuses.get(marketId);
    const currentStatus = currentEntry?.status;
    const now = Date.now();

    // Check if this is a valid transition
    if (currentStatus && !isValidMarketTransition(currentStatus, newStatus)) {
      const error = `Invalid market status transition: ${currentStatus} → ${newStatus}`;
      console.error(`[StatusAnnouncement] Market ${marketId}: ${error}`);
      return {
        success: false,
        error,
        shouldAnnounce: false,
        priority: "polite",
      };
    }

    // Check if we should deduplicate (same status announced recently)
    const isDuplicate =
      currentStatus === newStatus &&
      currentEntry &&
      now - currentEntry.lastAnnouncedAt < DEDUPLICATION_WINDOW;

    if (isDuplicate) {
      console.debug(
        `[StatusAnnouncement] Market ${marketId}: Deduplicating ${newStatus} announcement`,
      );
      return {
        success: true,
        shouldAnnounce: false,
        priority: getStatusAnnouncementPriority(newStatus),
      };
    }

    // Update state and signal that announcement should proceed
    set((state) => ({
      marketStatuses: new Map(state.marketStatuses).set(marketId, {
        status: newStatus,
        lastAnnouncedAt: now,
      }),
    }));

    console.debug(
      `[StatusAnnouncement] Market ${marketId}: ${currentStatus || "untracked"} → ${newStatus}`,
    );

    return {
      success: true,
      shouldAnnounce: true,
      priority: getStatusAnnouncementPriority(newStatus),
    };
  },

  announceBetStatusChange: (betId: string, newStatus: BetStatus) => {
    const currentEntry = get().betStatuses.get(betId);
    const currentStatus = currentEntry?.status;
    const now = Date.now();

    // Check if this is a valid transition
    if (currentStatus && !isValidBetTransition(currentStatus, newStatus)) {
      const error = `Invalid bet status transition: ${currentStatus} → ${newStatus}`;
      console.error(`[StatusAnnouncement] Bet ${betId}: ${error}`);
      return {
        success: false,
        error,
        shouldAnnounce: false,
        priority: "polite",
      };
    }

    // Check if we should deduplicate (same status announced recently)
    const isDuplicate =
      currentStatus === newStatus &&
      currentEntry &&
      now - currentEntry.lastAnnouncedAt < DEDUPLICATION_WINDOW;

    if (isDuplicate) {
      console.debug(
        `[StatusAnnouncement] Bet ${betId}: Deduplicating ${newStatus} announcement`,
      );
      return {
        success: true,
        shouldAnnounce: false,
        priority: getStatusAnnouncementPriority(newStatus),
      };
    }

    // Update state and signal that announcement should proceed
    set((state) => ({
      betStatuses: new Map(state.betStatuses).set(betId, {
        status: newStatus,
        lastAnnouncedAt: now,
      }),
    }));

    console.debug(
      `[StatusAnnouncement] Bet ${betId}: ${currentStatus || "untracked"} → ${newStatus}`,
    );

    return {
      success: true,
      shouldAnnounce: true,
      priority: getStatusAnnouncementPriority(newStatus),
    };
  },

  getMarketStatus: (marketId: string) => {
    return get().marketStatuses.get(marketId)?.status;
  },

  getBetStatus: (betId: string) => {
    return get().betStatuses.get(betId)?.status;
  },

  reset: () => {
    set({
      marketStatuses: new Map(),
      betStatuses: new Map(),
    });
  },
}));
