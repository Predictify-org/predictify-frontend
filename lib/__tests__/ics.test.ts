import { createMarketCalendarEvents } from "@/lib/calendar";
import { buildIcs } from "@/lib/ics";
import type { Event } from "@/types/events";

const market: Event = {
  id: "emoji-market",
  title: "Win, or lose; maybe 🏆",
  txHash: "hash",
  category: "Football",
  odds: 2,
  startDate: "2026-02-01T10:00:00.000Z",
  endDate: "2026-02-01T23:59:00.000Z",
  resolutionDate: "2026-02-03T12:00:00.000Z",
  status: "ongoing",
  participants: 1,
};

describe("buildIcs", () => {
  it("writes RFC 5545 fields with CRLF endings, escaped text, and stable UIDs", () => {
    const [closing, resolution] = createMarketCalendarEvents([market]);
    const now = new Date("2026-02-01T00:00:00.000Z");
    const firstExport = buildIcs([closing, resolution], { now });
    const secondExport = buildIcs([closing, resolution], { now });

    expect(firstExport).toBe(secondExport);
    expect(firstExport.endsWith("\r\n")).toBe(true);
    expect(firstExport.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(firstExport).toContain("BEGIN:VCALENDAR\r\n");
    expect(firstExport).toContain("DTSTAMP:20260201T000000Z\r\n");
    expect(firstExport).toContain("DTSTART:20260201T235900Z\r\n");
    expect(firstExport).toContain("DTEND:20260202T005900Z\r\n");
    expect(firstExport).toContain("SUMMARY:Market closes: Win\\, or lose\\; maybe 🏆\r\n");
    expect(firstExport).toContain("UID:emoji-market-closing@predictify\r\n");
    expect(firstExport).toContain("UID:emoji-market-resolution@predictify\r\n");
  });

  it("folds long UTF-8 lines without exceeding 75 octets", () => {
    const [closing] = createMarketCalendarEvents([market]);
    const event = {
      ...closing,
      description: `${"very long description 🏆,".repeat(16)}\\;`,
    };
    const ics = buildIcs([event]);
    const physicalLines = ics.split("\r\n").filter(Boolean);

    expect(physicalLines.some((line) => line.startsWith(" "))).toBe(true);
    expect(
      physicalLines.every((line) => Buffer.byteLength(line, "utf8") <= 75),
    ).toBe(true);
    // Unfolding the continuation lines restores the escaped trailing "\\;"
    // sequence intact, proving folding never splits an escaped character.
    expect(ics.replace(/\r\n /g, "")).toContain(`${"\\".repeat(3)};`);
  });
});
