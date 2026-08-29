/**
 * useStatusChangeAnnouncement Hook
 *
 * Integrates market and bet status changes with the global live region.
 * Handles announcement logic: validation, deduplication, priority, and integration
 * with the accessibility announcement system.
 *
 * Invariants:
 * - Only announces valid status transitions
 * - Deduplicates rapid repeated announcements
 * - Respects live region priority levels
 * - Non-blocking: failures don't prevent component render
 */

"use client";

import { useEffect, useCallback } from "react";
import { useStatusAnnouncementStore } from "@/app/state/statusAnnouncements";
import { useGlobalLiveRegion } from "@/hooks/use-global-live-region";
import {
  MarketStatus,
  BetStatus,
  getMarketStatusMessage,
  getBetStatusMessage,
} from "@/lib/status-announcement-messages";

interface UseStatusChangeAnnouncementOptions {
  /** Enable debug logging for announcement events */
  debug?: boolean;
}

/**
 * Hook for announcing market status changes to screen readers
 *
 * Usage:
 * ```tsx
 * const { announceMarketStatus } = useStatusChangeAnnouncement();
 *
 * useEffect(() => {
 *   if (market?.status) {
 *     announceMarketStatus(market.id, market.status, market.title);
 *   }
 * }, [market?.status]);
 * ```
 *
 * @param options - Optional configuration
 * @returns Object with announcement functions
 *
 * Invariants:
 * - Only announces if status transition is valid
 * - Skips announcement if transition is invalid (but logs error)
 * - Respects deduplication window to avoid notification spam
 */
export function useStatusChangeAnnouncement(
  options: UseStatusChangeAnnouncementOptions = {},
) {
  const { debug = false } = options;
  const { announce } = useGlobalLiveRegion();
  const announceMarketStatusChange = useStatusAnnouncementStore(
    (s) => s.announceMarketStatusChange,
  );
  const announceBetStatusChange = useStatusAnnouncementStore(
    (s) => s.announceBetStatusChange,
  );

  /**
   * Announce a market status change
   * Thread-safe: can be called multiple times with same status (deduplicates)
   *
   * @param marketId - Unique market identifier
   * @param newStatus - Target market status
   * @param marketTitle - Optional market title for context in message
   *
   * Returns: true if announcement was sent, false if skipped (duplicate or invalid)
   */
  const announceMarketStatus = useCallback(
    (marketId: string, newStatus: MarketStatus, marketTitle?: string): boolean => {
      if (!marketId) {
        console.warn("[useStatusChangeAnnouncement] announceMarketStatus: missing marketId");
        return false;
      }

      const result = announceMarketStatusChange(marketId, newStatus);

      if (!result.success) {
        if (debug) {
          console.warn(
            `[useStatusChangeAnnouncement] Market ${marketId}: ${result.error}`,
          );
        }
        return false;
      }

      if (!result.shouldAnnounce) {
        if (debug) {
          console.debug(
            `[useStatusChangeAnnouncement] Market ${marketId}: skipped (duplicate or already announced)`,
          );
        }
        return false;
      }

      // Generate and announce message
      const message = getMarketStatusMessage(newStatus, marketTitle);
      announce({ message, priority: result.priority });

      if (debug) {
        console.debug(
          `[useStatusChangeAnnouncement] Market ${marketId}: announced "${message}"`,
        );
      }

      return true;
    },
    [announceMarketStatusChange, announce, debug],
  );

  /**
   * Announce a bet status change
   * Thread-safe: can be called multiple times with same status (deduplicates)
   *
   * @param betId - Unique bet identifier
   * @param newStatus - Target bet status
   * @param marketTitle - Optional market title for context in message
   *
   * Returns: true if announcement was sent, false if skipped (duplicate or invalid)
   */
  const announceBetStatus = useCallback(
    (betId: string, newStatus: BetStatus, marketTitle?: string): boolean => {
      if (!betId) {
        console.warn("[useStatusChangeAnnouncement] announceBetStatus: missing betId");
        return false;
      }

      const result = announceBetStatusChange(betId, newStatus);

      if (!result.success) {
        if (debug) {
          console.warn(
            `[useStatusChangeAnnouncement] Bet ${betId}: ${result.error}`,
          );
        }
        return false;
      }

      if (!result.shouldAnnounce) {
        if (debug) {
          console.debug(
            `[useStatusChangeAnnouncement] Bet ${betId}: skipped (duplicate or already announced)`,
          );
        }
        return false;
      }

      // Generate and announce message
      const message = getBetStatusMessage(newStatus, marketTitle);
      announce({ message, priority: result.priority });

      if (debug) {
        console.debug(
          `[useStatusChangeAnnouncement] Bet ${betId}: announced "${message}"`,
        );
      }

      return true;
    },
    [announceBetStatusChange, announce, debug],
  );

  return {
    announceMarketStatus,
    announceBetStatus,
  };
}
