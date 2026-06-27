/**
 * ICS (iCalendar) file generation utilities for StreamPay vesting schedules.
 *
 * This module provides functions to generate RFC 5545 compliant ICS files
 * for stream vesting dates, allowing users to export payment schedules to
 * calendar applications.
 */

export interface VestingEvent {
  /** Unique identifier for the vesting event */
  uid: string;
  /** Event title */
  summary: string;
  /** Detailed description of the vesting event */
  description: string;
  /** Start time in ISO 8601 format */
  start: Date;
  /** End time in ISO 8601 format */
  end: Date;
  /** Location (optional) */
  location?: string;
  /** Stream ID this event belongs to */
  streamId: string;
  /** Amount being vested */
  amount?: string;
  /** Token type (e.g., XLM) */
  token?: string;
}

/**
 * Escapes special characters in ICS text fields according to RFC 5545.
 * Characters that need escaping: \ , ; : and newlines
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a Date object to ICS datetime format (YYYYMMDDTHHMMSSZ).
 * Uses UTC time to ensure consistency across timezones.
 */
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Generates a unique UID for an ICS event.
 * Format: <stream-id>-<timestamp>@streampay.io
 */
function generateEventUid(streamId: string, timestamp: Date): string {
  const timeStr = timestamp.getTime().toString();
  return `${streamId}-${timeStr}@streampay.io`;
}

/**
 * Converts a vesting event to ICS VEVENT format.
 */
function eventToIcs(event: VestingEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Parses a stream rate string to extract amount and period.
 * Expected formats: "120 XLM / month", "32 XLM / week", "18 XLM / day"
 */
function parseRate(rate: string): { amount: string; period: 'day' | 'week' | 'month' } | null {
  const match = rate.match(/^(\d+(?:\.\d+)?)\s+(\w+)\s*\/\s*(day|week|month)$/i);
  if (!match) return null;

  return {
    amount: match[1],
    period: match[3].toLowerCase() as 'day' | 'week' | 'month',
  };
}

/**
 * Calculates vesting dates based on stream schedule.
 * Generates recurring events from the stream creation date.
 */
export function calculateVestingDates(
  streamId: string,
  rate: string,
  createdAt: string,
  status: string,
  token: string = 'XLM',
  maxEvents: number = 52 // Limit to 1 year of events for weekly streams
): VestingEvent[] {
  const parsedRate = parseRate(rate);
  if (!parsedRate) {
    return [];
  }

  const startDate = new Date(createdAt);
  const events: VestingEvent[] = [];
  const periodMs = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000, // Approximate
  };

  // Don't generate future events for ended/cancelled streams
  const isEnded = status === 'ended' || status === 'cancelled' || status === 'withdrawn';
  const now = new Date();

  for (let i = 0; i < maxEvents; i++) {
    const eventStart = new Date(startDate.getTime() + i * periodMs[parsedRate.period]);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Skip past events
    if (eventEnd < now) continue;

    // For ended streams, don't generate future events
    if (isEnded && eventStart > now) break;

    events.push({
      uid: generateEventUid(streamId, eventStart),
      summary: `Vesting: ${parsedRate.amount} ${token}`,
      description: `Stream ${streamId} vesting payment of ${parsedRate.amount} ${token}. Rate: ${rate}`,
      start: eventStart,
      end: eventEnd,
      streamId,
      amount: parsedRate.amount,
      token,
    });
  }

  return events;
}

/**
 * Generates a complete ICS file content from vesting events.
 * Returns a string in RFC 5545 format.
 */
export function generateIcsFile(
  events: VestingEvent[],
  calendarName: string = 'StreamPay Vesting Schedule'
): string {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StreamPay//Vesting Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:UTC`,
    `X-WR-CALDESC:${escapeIcsText('Stream payment vesting schedule exported from StreamPay')}`,
  ];

  events.forEach(event => {
    lines.push(eventToIcs(event));
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Creates a download trigger for an ICS file.
 * Generates a Blob and triggers a browser download.
 */
export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for the ICS export based on stream details.
 */
export function generateIcsFilename(streamId: string, label?: string): string {
  const safeLabel = label ? label.replace(/[^a-z0-9]/gi, '-') : streamId;
  return `streampay-vesting-${safeLabel}.ics`;
}

/**
 * Main function to export stream vesting schedule as ICS file.
 * Combines all steps: calculate dates, generate ICS, and trigger download.
 */
export function exportStreamVestingAsIcs(
  streamId: string,
  rate: string,
  createdAt: string,
  status: string,
  token: string = 'XLM',
  label?: string
): void {
  const events = calculateVestingDates(streamId, rate, createdAt, status, token);
  
  if (events.length === 0) {
    throw new Error('No vesting dates to export. Stream may have an invalid rate format.');
  }

  const calendarName = label ? `StreamPay: ${label}` : 'StreamPay Vesting Schedule';
  const icsContent = generateIcsFile(events, calendarName);
  const filename = generateIcsFilename(streamId, label);
  
  downloadIcsFile(icsContent, filename);
}
