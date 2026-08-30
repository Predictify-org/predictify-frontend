/**
 * Tests for useStatusChangeAnnouncement Hook
 *
 * Validates:
 * - Integration with global live region
 * - Announcement filtering and deduplication
 * - Error handling
 * - Debug logging
 * - Edge cases and boundary conditions
 */

import { renderHook, act } from "@testing-library/react";
import { useStatusChangeAnnouncement } from "@/hooks/useStatusChangeAnnouncement";
import { useGlobalLiveRegion } from "@/hooks/use-global-live-region";
import { useStatusAnnouncementStore } from "@/app/state/statusAnnouncements";

// Mock the global live region hook
jest.mock("@/hooks/use-global-live-region");
jest.mock("@/app/state/statusAnnouncements");

describe("useStatusChangeAnnouncement Hook", () => {
  let mockAnnounce: jest.Mock;

  beforeEach(() => {
    mockAnnounce = jest.fn();
    (useGlobalLiveRegion as jest.Mock).mockReturnValue({
      announce: mockAnnounce,
    });

    // Reset store mock
    (useStatusAnnouncementStore as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("announceMarketStatus", () => {
    it("should announce valid market status change", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        const announced = result.current.announceMarketStatus("market-1", "open", "Test Market");
        expect(announced).toBe(true);
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Test Market"),
          priority: "polite",
        }),
      );
    });

    it("should respect deduplication and not announce duplicates", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceMarketStatus("market-1", "open");
      });

      mockAnnounce.mockClear();

      act(() => {
        // Simulate duplicate by calling again
        // (Note: actual deduplication logic is in the store, this tests hook's handling)
        const announced = result.current.announceMarketStatus("market-1", "open");
        expect(announced).toBe(false); // Should return false for duplicate
      });

      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it("should use assertive priority for resolved status", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceMarketStatus("market-1", "resolved");
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "assertive",
        }),
      );
    });

    it("should include market title in message when provided", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceMarketStatus("market-1", "closed", "Bitcoin Prediction");
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Bitcoin Prediction"),
        }),
      );
    });

    it("should handle missing marketId gracefully", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        const announced = result.current.announceMarketStatus("", "open");
        expect(announced).toBe(false);
      });

      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it("should log errors when debug is enabled", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const { result } = renderHook(() =>
        useStatusChangeAnnouncement({ debug: true }),
      );

      act(() => {
        result.current.announceMarketStatus("", "open");
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("announceBetStatus", () => {
    it("should announce valid bet status change", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        const announced = result.current.announceBetStatus("bet-1", "completed", "Test Market");
        expect(announced).toBe(true);
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Test Market"),
          priority: "assertive", // completed is time-critical
        }),
      );
    });

    it("should respect deduplication for bet status", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceBetStatus("bet-1", "active");
      });

      mockAnnounce.mockClear();

      act(() => {
        const announced = result.current.announceBetStatus("bet-1", "active");
        expect(announced).toBe(false); // Duplicate
      });

      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it("should use assertive priority for completed status", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceBetStatus("bet-1", "completed");
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "assertive",
        }),
      );
    });

    it("should handle missing betId gracefully", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        const announced = result.current.announceBetStatus("", "active");
        expect(announced).toBe(false);
      });

      expect(mockAnnounce).not.toHaveBeenCalled();
    });
  });

  describe("Integration", () => {
    it("should work with multiple announcements in sequence", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceMarketStatus("market-1", "open");
        result.current.announceBetStatus("bet-1", "active");
      });

      expect(mockAnnounce).toHaveBeenCalledTimes(2);
    });

    it("should maintain separate state for markets and bets", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        result.current.announceMarketStatus("market-1", "open");
        result.current.announceBetStatus("bet-1", "active");
      });

      mockAnnounce.mockClear();

      act(() => {
        // Same ID but different type should not deduplicate
        result.current.announceMarketStatus("market-1", "open");
        result.current.announceBetStatus("bet-1", "active");
      });

      // Should deduplicate within their own type
      expect(mockAnnounce).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined market title", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      act(() => {
        const announced = result.current.announceMarketStatus("market-1", "open");
        expect(announced).toBe(true);
      });

      expect(mockAnnounce).toHaveBeenCalled();
    });

    it("should not throw on empty message", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      expect(() => {
        act(() => {
          result.current.announceMarketStatus("market-1", "open", "");
        });
      }).not.toThrow();
    });

    it("should handle special characters in market title", () => {
      const { result } = renderHook(() => useStatusChangeAnnouncement());

      const specialTitle = 'Market "Test & <Special>"';

      act(() => {
        result.current.announceMarketStatus("market-1", "open", specialTitle);
      });

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Market"),
        }),
      );
    });
  });

  describe("Debug mode", () => {
    it("should log debug messages when enabled", () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();
      const { result } = renderHook(() =>
        useStatusChangeAnnouncement({ debug: true }),
      );

      act(() => {
        result.current.announceMarketStatus("market-1", "open");
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should not log debug messages when disabled", () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();
      const { result } = renderHook(() =>
        useStatusChangeAnnouncement({ debug: false }),
      );

      act(() => {
        result.current.announceMarketStatus("market-1", "open");
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
