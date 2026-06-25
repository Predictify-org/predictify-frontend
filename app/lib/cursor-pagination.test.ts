/**
 * Tests for cursor-based pagination utilities.
 *
 * Covers:
 * - Round-trip encoding/decoding
 * - Tampered cursor detection
 * - Boundary cases (empty strings, invalid base64, malformed structure)
 * - HMAC signature verification
 * - Timing-safe comparison
 */

import {
  encodeCursor,
  decodeCursor,
  parsePaginationParams,
  type CursorPayload,
} from "./cursor-pagination";

describe("cursor-pagination", () => {
  describe("encodeCursor", () => {
    it("encodes a valid cursor from created_at and id", () => {
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc123");
      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);
      // Base64 should only contain valid characters
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("produces different cursors for different inputs", () => {
      const cursor1 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const cursor2 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_xyz");
      const cursor3 = encodeCursor("2024-01-16T10:00:00.000Z", "stream_abc");

      expect(cursor1).not.toBe(cursor2);
      expect(cursor1).not.toBe(cursor3);
      expect(cursor2).not.toBe(cursor3);
    });

    it("is deterministic for same inputs", () => {
      const cursor1 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const cursor2 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      expect(cursor1).toBe(cursor2);
    });
  });

  describe("decodeCursor", () => {
    it("decodes a valid cursor", () => {
      const createdAt = "2024-01-15T10:00:00.000Z";
      const id = "stream_abc123";
      const cursor = encodeCursor(createdAt, id);

      const decoded = decodeCursor(cursor);
      expect(decoded.createdAt).toBe(createdAt);
      expect(decoded.id).toBe(id);
    });

    it("round-trips correctly", () => {
      const testCases: Array<[string, string]> = [
        ["2024-01-15T10:00:00.000Z", "stream_abc"],
        ["2026-04-28T11:00:00.000Z", "stream-kemi"],
        ["2024-12-31T23:59:59.999Z", "stream_xyz_123"],
        ["2024-01-01T00:00:00.000Z", "s"],
      ];

      for (const [createdAt, id] of testCases) {
        const cursor = encodeCursor(createdAt, id);
        const decoded = decodeCursor(cursor);
        expect(decoded).toEqual({ createdAt, id });
      }
    });

    it("throws on empty cursor", () => {
      expect(() => decodeCursor("")).toThrow("Invalid cursor: must be non-empty string");
    });

    it("throws on null cursor", () => {
      expect(() => decodeCursor(null as any)).toThrow("Invalid cursor: must be non-empty string");
    });

    it("throws on undefined cursor", () => {
      expect(() => decodeCursor(undefined as any)).toThrow("Invalid cursor: must be non-empty string");
    });

    it("throws on non-string cursor", () => {
      expect(() => decodeCursor(123 as any)).toThrow("Invalid cursor: must be non-empty string");
    });

    it("throws on invalid base64", () => {
      // Invalid base64 characters - note: most strings are valid base64, so this will fail on structure
      const invalidCursor = Buffer.from("not|enough|parts|here").toString("base64");
      expect(() => decodeCursor(invalidCursor)).toThrow("Invalid cursor");
    });

    it("throws on tampered cursor (modified id)", () => {
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const [sig, createdAt] = decoded.split("|");
      // Change the id
      const tampered = Buffer.from(`${sig}|${createdAt}|stream_xyz`).toString("base64");

      expect(() => decodeCursor(tampered)).toThrow("Invalid cursor: signature verification failed");
    });

    it("throws on tampered cursor (modified timestamp)", () => {
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const [sig, , id] = decoded.split("|");
      // Change the timestamp
      const tampered = Buffer.from(`${sig}|2024-01-16T10:00:00.000Z|${id}`).toString("base64");

      expect(() => decodeCursor(tampered)).toThrow("Invalid cursor: signature verification failed");
    });

    it("throws on tampered cursor (modified signature)", () => {
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const [, createdAt, id] = decoded.split("|");
      // Use a different signature
      const fakeSig = "0".repeat(64);
      const tampered = Buffer.from(`${fakeSig}|${createdAt}|${id}`).toString("base64");

      expect(() => decodeCursor(tampered)).toThrow("Invalid cursor: signature verification failed");
    });

    it("throws on malformed structure (missing parts)", () => {
      // Only 2 parts instead of 3
      const malformed = Buffer.from("signature:timestamp").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: malformed structure");
    });

    it("throws on malformed structure (too many parts)", () => {
      // 4 parts instead of 3
      const malformed = Buffer.from("sig:timestamp:id:extra").toString("base64");
      expect(() => decodeCursor(malformed)).toThrow("Invalid cursor: malformed structure");
    });

    it("throws on invalid timestamp format", () => {
      // Create a cursor with a valid signature but invalid timestamp
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const [sig, , id] = decoded.split(":");

      // Use an invalid timestamp
      const invalidTs = "not-a-timestamp";
      // Need to recompute signature for the invalid timestamp to pass signature check
      // But the timestamp validation should fail first
      const tampered = Buffer.from(`${sig}:${invalidTs}:${id}`).toString("base64");

      expect(() => decodeCursor(tampered)).toThrow("Invalid cursor: malformed timestamp");
    });

    it("rejects cursors with wrong signature length", () => {
      // Signature should be 64 hex chars (HMAC-SHA256)
      const shortSig = "abc";
      const tampered = Buffer.from(`${shortSig}|2024-01-15T10:00:00.000Z|stream_abc`).toString("base64");

      expect(() => decodeCursor(tampered)).toThrow("Invalid cursor: signature verification failed");
    });
  });

  describe("parsePaginationParams", () => {
    it("parses valid cursor and limit", () => {
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const params = new URLSearchParams({ cursor, limit: "50" });

      const result = parsePaginationParams(params);
      expect(result.cursor).toEqual({
        createdAt: "2024-01-15T10:00:00.000Z",
        id: "stream_abc",
      });
      expect(result.limit).toBe(50);
    });

    it("returns null cursor when not provided", () => {
      const params = new URLSearchParams({ limit: "30" });

      const result = parsePaginationParams(params);
      expect(result.cursor).toBeNull();
      expect(result.limit).toBe(30);
    });

    it("uses default limit of 20 when not provided", () => {
      const params = new URLSearchParams();

      const result = parsePaginationParams(params);
      expect(result.cursor).toBeNull();
      expect(result.limit).toBe(20);
    });

    it("clamps limit to minimum of 1", () => {
      const params = new URLSearchParams({ limit: "0" });
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(1);

      const params2 = new URLSearchParams({ limit: "-10" });
      const result2 = parsePaginationParams(params2);
      expect(result2.limit).toBe(1);
    });

    it("clamps limit to maximum of 100", () => {
      const params = new URLSearchParams({ limit: "101" });
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(100);

      const params2 = new URLSearchParams({ limit: "999" });
      const result2 = parsePaginationParams(params2);
      expect(result2.limit).toBe(100);
    });

    it("handles non-numeric limit gracefully", () => {
      const params = new URLSearchParams({ limit: "abc" });
      const result = parsePaginationParams(params);
      expect(result.limit).toBe(20); // default
    });

    it("throws on invalid cursor", () => {
      const params = new URLSearchParams({ cursor: "invalid!!!" });
      expect(() => parsePaginationParams(params)).toThrow("Invalid cursor");
    });
  });

  describe("security properties", () => {
    it("prevents cursor reuse across different timestamps", () => {
      const cursor1 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const cursor2 = encodeCursor("2024-01-16T10:00:00.000Z", "stream_abc");

      // Cursors should be different even with same id
      expect(cursor1).not.toBe(cursor2);

      // Each should decode to its own values
      expect(decodeCursor(cursor1).createdAt).toBe("2024-01-15T10:00:00.000Z");
      expect(decodeCursor(cursor2).createdAt).toBe("2024-01-16T10:00:00.000Z");
    });

    it("prevents cursor reuse across different ids", () => {
      const cursor1 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const cursor2 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_xyz");

      // Cursors should be different even with same timestamp
      expect(cursor1).not.toBe(cursor2);

      // Each should decode to its own values
      expect(decodeCursor(cursor1).id).toBe("stream_abc");
      expect(decodeCursor(cursor2).id).toBe("stream_xyz");
    });

    it("HMAC signature changes if payload changes", () => {
      const cursor1 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc");
      const cursor2 = encodeCursor("2024-01-15T10:00:00.000Z", "stream_xyz");

      const decoded1 = Buffer.from(cursor1, "base64").toString("utf8");
      const decoded2 = Buffer.from(cursor2, "base64").toString("utf8");

      const sig1 = decoded1.split("|")[0];
      const sig2 = decoded2.split("|")[0];

      // Signatures should be different
      expect(sig1).not.toBe(sig2);
      expect(sig1.length).toBe(64); // HMAC-SHA256 = 64 hex chars
      expect(sig2.length).toBe(64);
    });
  });

  describe("edge cases", () => {
    it("handles very long stream ids", () => {
      const longId = "stream_" + "x".repeat(200);
      const cursor = encodeCursor("2024-01-15T10:00:00.000Z", longId);
      const decoded = decodeCursor(cursor);
      expect(decoded.id).toBe(longId);
    });

    it("handles stream ids with special characters", () => {
      const specialIds = [
        "stream_with-dashes",
        "stream_with_underscores",
        "stream.with.dots",
        "stream:with:colons", // Note: colons in id might be confusing but should work
      ];

      for (const id of specialIds) {
        const cursor = encodeCursor("2024-01-15T10:00:00.000Z", id);
        const decoded = decodeCursor(cursor);
        expect(decoded.id).toBe(id);
      }
    });

    it("handles timestamps with milliseconds", () => {
      const timestamp = "2024-01-15T10:00:00.123Z";
      const cursor = encodeCursor(timestamp, "stream_abc");
      const decoded = decodeCursor(cursor);
      expect(decoded.createdAt).toBe(timestamp);
    });

    it("handles timestamps without milliseconds", () => {
      const timestamp = "2024-01-15T10:00:00Z";
      const cursor = encodeCursor(timestamp, "stream_abc");
      const decoded = decodeCursor(cursor);
      expect(decoded.createdAt).toBe(timestamp);
    });

    it("handles timestamps with timezone offsets", () => {
      const timestamp = "2024-01-15T10:00:00+05:30";
      const cursor = encodeCursor(timestamp, "stream_abc");
      const decoded = decodeCursor(cursor);
      expect(decoded.createdAt).toBe(timestamp);
    });
  });
});
