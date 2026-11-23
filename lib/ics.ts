import type { MarketCalendarEvent } from "@/lib/calendar";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function toUtcDateTime(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Calendar event contains an invalid date.");
  }

  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function utf8Length(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return length;
}

function foldLine(line: string): string {
  const folded: string[] = [];
  let current = "";
  let currentLength = 0;

  for (const character of line) {
    const characterLength = utf8Length(character);
    if (currentLength + characterLength > 75) {
      folded.push(current);
      current = " ";
      currentLength = 1;
    }
    current += character;
    currentLength += characterLength;
  }

  folded.push(current);
  return folded.join("\r\n");
}

export function buildIcs(
  events: MarketCalendarEvent[],
  options: { prodId?: string; now?: Date } = {},
): string {
  const prodId = options.prodId ?? "-//Predictify//Market Calendar//EN";
  const now = options.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${escapeText(prodId)}`,
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event) => {
      const start = event.date;
      const end = new Date(start.getTime() + HOUR_IN_MILLISECONDS);
      return [
        "BEGIN:VEVENT",
        `UID:${escapeText(event.uid)}`,
        `DTSTAMP:${toUtcDateTime(now)}`,
        `DTSTART:${toUtcDateTime(start)}`,
        `DTEND:${toUtcDateTime(end)}`,
        `SUMMARY:${escapeText(event.summary)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        `URL:${escapeText(event.url)}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
