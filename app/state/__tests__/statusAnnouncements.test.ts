/**
 * Tests for Status Announcement Store
 *
 * Validates:
 * - State transitions are deterministic
 * - Concurrent updates don't produce inconsistent state
 * - Deduplication works correctly
 * - Error cases are handled safely
 * - All invariants are maintained
 */

import { renderHook, act } from "@testing-library/react";
import { useStatusAnnouncementStore } from "@/app/state/statusAnnouncements";

describe("useStatusAnnouncementStore", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStatusAnnouncementStore());
    result.current.reset();
  });

  describe("announceMarketStatusChange", () => {
    it("should announce valid first status transition", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      const res = result.current.announceMarketStatusChange("market-1", "open");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(res.priority).toBe("polite");
      expect(result.current.getMarketStatus("market-1")).toBe("open");
    });

    it("should announce valid sequential transition", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceMarketStatusChange("market-1", "closing_soon");
      });

      expect(result.current.getMarketStatus("market-1")).toBe("closing_soon");
    });

    it("should reject invalid transition", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
      });

      const res = result.current.announceMarketStatusChange("market-1", "resolved");

      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
      expect(result.current.getMarketStatus("market-1")).toBe("open"); // State unchanged
    });

    it("should allow cancellation from any state", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "closed");
      });

      const res = result.current.announceMarketStatusChange("market-1", "cancelled");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(result.current.getMarketStatus("market-1")).toBe("cancelled");
    });

    it("should deduplicate rapid identical announcements", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
      });

      // Second call should be deduplicated
      const res2 = result.current.announceMarketStatusChange("market-1", "open");

      expect(res2.success).toBe(true);
      expect(res2.shouldAnnounce).toBe(false); // Deduplicated
    });

    it("should use assertive priority for resolved status", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceMarketStatusChange("market-1", "closing_soon");
        result.current.announceMarketStatusChange("market-1", "closed");
      });

      const res = result.current.announceMarketStatusChange("market-1", "resolved");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(res.priority).toBe("assertive");
    });

    it("should track multiple markets independently", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceMarketStatusChange("market-2", "closed");
      });

      expect(result.current.getMarketStatus("market-1")).toBe("open");
      expect(result.current.getMarketStatus("market-2")).toBe("closed");
    });

    it("should handle empty marketId gracefully", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      const res = result.current.announceMarketStatusChange("", "open");

      // Should not crash, but may return error
      expect(result.current.getMarketStatus("")).toBeUndefined();
    });
  });

  describe("announceBetStatusChange", () => {
    it("should announce valid first status transition", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      const res = result.current.announceBetStatusChange("bet-1", "active");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(res.priority).toBe("polite");
      expect(result.current.getBetStatus("bet-1")).toBe("active");
    });

    it("should allow active ↔ pending transitions", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
        result.current.announceBetStatusChange("bet-1", "pending");
      });

      expect(result.current.getBetStatus("bet-1")).toBe("pending");

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
      });

      expect(result.current.getBetStatus("bet-1")).toBe("active");
    });

    it("should reject invalid transition", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "completed");
      });

      const res = result.current.announceBetStatusChange("bet-1", "active");

      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
      expect(result.current.getBetStatus("bet-1")).toBe("completed");
    });

    it("should allow cancellation from any state", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "completed");
      });

      const res = result.current.announceBetStatusChange("bet-1", "cancelled");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(result.current.getBetStatus("bet-1")).toBe("cancelled");
    });

    it("should deduplicate rapid identical announcements", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
      });

      const res2 = result.current.announceBetStatusChange("bet-1", "active");

      expect(res2.success).toBe(true);
      expect(res2.shouldAnnounce).toBe(false);
    });

    it("should use assertive priority for completed status", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
      });

      const res = result.current.announceBetStatusChange("bet-1", "completed");

      expect(res.success).toBe(true);
      expect(res.shouldAnnounce).toBe(true);
      expect(res.priority).toBe("assertive");
    });

    it("should track multiple bets independently", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
        result.current.announceBetStatusChange("bet-2", "cancelled");
      });

      expect(result.current.getBetStatus("bet-1")).toBe("active");
      expect(result.current.getBetStatus("bet-2")).toBe("cancelled");
    });
  });

  describe("Concurrent operations", () => {
    it("should handle multiple markets being updated simultaneously", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceMarketStatusChange("market-2", "open");
        result.current.announceMarketStatusChange("market-3", "open");
        result.current.announceMarketStatusChange("market-1", "closing_soon");
        result.current.announceMarketStatusChange("market-2", "closing_soon");
      });

      expect(result.current.getMarketStatus("market-1")).toBe("closing_soon");
      expect(result.current.getMarketStatus("market-2")).toBe("closing_soon");
      expect(result.current.getMarketStatus("market-3")).toBe("open");
    });

    it("should handle multiple bets being updated simultaneously", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceBetStatusChange("bet-1", "active");
        result.current.announceBetStatusChange("bet-2", "active");
        result.current.announceBetStatusChange("bet-1", "pending");
        result.current.announceBetStatusChange("bet-2", "completed");
      });

      expect(result.current.getBetStatus("bet-1")).toBe("pending");
      expect(result.current.getBetStatus("bet-2")).toBe("completed");
    });

    it("should maintain consistency during mixed market and bet updates", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceBetStatusChange("bet-1", "active");
        result.current.announceMarketStatusChange("market-1", "closing_soon");
        result.current.announceBetStatusChange("bet-1", "pending");
      });

      expect(result.current.getMarketStatus("market-1")).toBe("closing_soon");
      expect(result.current.getBetStatus("bet-1")).toBe("pending");
    });
  });

  describe("Edge cases", () => {
    it("should return undefined for non-existent market", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());
      expect(result.current.getMarketStatus("nonexistent")).toBeUndefined();
    });

    it("should return undefined for non-existent bet", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());
      expect(result.current.getBetStatus("nonexistent")).toBeUndefined();
    });

    it("should reset state correctly", () => {
      const { result } = renderHook(() => useStatusAnnouncementStore());

      act(() => {
        result.current.announceMarketStatusChange("market-1", "open");
        result.current.announceBetStatusChange("bet-1", "active");
        result.current.reset();
      });

      expect(result.current.getMarketStatus("market-1")).toBeUndefined();
      expect(result.current.getBetStatus("bet-1")).toBeUndefined();
    });
  });
});
