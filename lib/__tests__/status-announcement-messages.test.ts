/**
 * Tests for Status Announcement Messages
 *
 * Validates:
 * - Message generation for all status types
 * - Valid and invalid status transitions
 * - Priority levels based on status
 * - Error cases and edge conditions
 */

import {
  getMarketStatusMessage,
  getBetStatusMessage,
  getStatusAnnouncementPriority,
  isValidMarketTransition,
  isValidBetTransition,
  MarketStatus,
  BetStatus,
} from "@/lib/status-announcement-messages";

describe("Status Announcement Messages", () => {
  describe("getMarketStatusMessage", () => {
    it("should return base message without market title", () => {
      expect(getMarketStatusMessage("open")).toContain("open");
      expect(getMarketStatusMessage("closed")).toContain("closed");
      expect(getMarketStatusMessage("resolved")).toContain("resolved");
    });

    it("should include market title when provided", () => {
      const title = "Will Bitcoin reach $100k?";
      const message = getMarketStatusMessage("open", title);
      expect(message).toContain(title);
      expect(message).toContain("open");
    });

    it("should handle all market statuses", () => {
      const statuses: MarketStatus[] = [
        "open",
        "closing_soon",
        "closed",
        "resolved",
        "cancelled",
      ];
      statuses.forEach((status) => {
        expect(() => getMarketStatusMessage(status)).not.toThrow();
        expect(getMarketStatusMessage(status)).toBeTruthy();
      });
    });

    it("should not include sensitive data", () => {
      const message = getMarketStatusMessage("open", "Test Market");
      expect(message).not.toMatch(/0x[a-fA-F0-9]{40}/); // No wallet addresses
      expect(message).not.toMatch(/\$\d+/); // No amounts
    });
  });

  describe("getBetStatusMessage", () => {
    it("should return base message without market title", () => {
      expect(getBetStatusMessage("active")).toContain("active");
      expect(getBetStatusMessage("completed")).toContain("complete");
      expect(getBetStatusMessage("cancelled")).toContain("cancelled");
    });

    it("should include market title when provided", () => {
      const title = "Will Bitcoin reach $100k?";
      const message = getBetStatusMessage("completed", title);
      expect(message).toContain(title);
      expect(message).toContain("complete");
    });

    it("should handle all bet statuses", () => {
      const statuses: BetStatus[] = ["active", "pending", "completed", "cancelled"];
      statuses.forEach((status) => {
        expect(() => getBetStatusMessage(status)).not.toThrow();
        expect(getBetStatusMessage(status)).toBeTruthy();
      });
    });

    it("should not include sensitive data", () => {
      const message = getBetStatusMessage("active", "Test Bet");
      expect(message).not.toMatch(/0x[a-fA-F0-9]{40}/); // No wallet addresses
      expect(message).not.toMatch(/\$\d+/); // No amounts
    });
  });

  describe("getStatusAnnouncementPriority", () => {
    it("should return assertive for time-critical market statuses", () => {
      expect(getStatusAnnouncementPriority("resolved")).toBe("assertive");
      expect(getStatusAnnouncementPriority("cancelled")).toBe("assertive");
    });

    it("should return polite for non-urgent market statuses", () => {
      expect(getStatusAnnouncementPriority("open")).toBe("polite");
      expect(getStatusAnnouncementPriority("closing_soon")).toBe("polite");
      expect(getStatusAnnouncementPriority("closed")).toBe("polite");
    });

    it("should return assertive for time-critical bet statuses", () => {
      expect(getStatusAnnouncementPriority("completed")).toBe("assertive");
      expect(getStatusAnnouncementPriority("cancelled")).toBe("assertive");
    });

    it("should return polite for non-urgent bet statuses", () => {
      expect(getStatusAnnouncementPriority("active")).toBe("polite");
      expect(getStatusAnnouncementPriority("pending")).toBe("polite");
    });
  });

  describe("isValidMarketTransition", () => {
    it("should allow valid sequential transitions", () => {
      expect(isValidMarketTransition("open", "closing_soon")).toBe(true);
      expect(isValidMarketTransition("closing_soon", "closed")).toBe(true);
      expect(isValidMarketTransition("closed", "resolved")).toBe(true);
    });

    it("should allow cancellation from any state", () => {
      expect(isValidMarketTransition("open", "cancelled")).toBe(true);
      expect(isValidMarketTransition("closing_soon", "cancelled")).toBe(true);
      expect(isValidMarketTransition("closed", "cancelled")).toBe(true);
      expect(isValidMarketTransition("resolved", "cancelled")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(isValidMarketTransition("closed", "open")).toBe(false); // Backward
      expect(isValidMarketTransition("open", "resolved")).toBe(false); // Skip step
      expect(isValidMarketTransition("resolved", "open")).toBe(false); // Terminal
    });

    it("should reject same-status transitions", () => {
      expect(isValidMarketTransition("open", "open")).toBe(false);
      expect(isValidMarketTransition("resolved", "resolved")).toBe(false);
    });

    it("should reject invalid terminal transitions", () => {
      expect(isValidMarketTransition("cancelled", "open")).toBe(false);
      expect(isValidMarketTransition("resolved", "closed")).toBe(false);
    });
  });

  describe("isValidBetTransition", () => {
    it("should allow active to pending/completed", () => {
      expect(isValidBetTransition("active", "pending")).toBe(true);
      expect(isValidBetTransition("active", "completed")).toBe(true);
    });

    it("should allow pending to active/completed", () => {
      expect(isValidBetTransition("pending", "active")).toBe(true);
      expect(isValidBetTransition("pending", "completed")).toBe(true);
    });

    it("should allow cancellation from any state", () => {
      expect(isValidBetTransition("active", "cancelled")).toBe(true);
      expect(isValidBetTransition("pending", "cancelled")).toBe(true);
      expect(isValidBetTransition("completed", "cancelled")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(isValidBetTransition("completed", "active")).toBe(false); // Terminal
      expect(isValidBetTransition("cancelled", "active")).toBe(false); // Terminal
    });

    it("should reject same-status transitions", () => {
      expect(isValidBetTransition("active", "active")).toBe(false);
      expect(isValidBetTransition("cancelled", "cancelled")).toBe(false);
    });
  });
});
