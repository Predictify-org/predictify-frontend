# ICS Calendar Export API Documentation

## Overview

This document describes the new ICS (iCalendar) export functionality added to StreamPay for exporting stream vesting schedules. Users can now export their payment stream vesting dates as calendar files compatible with Google Calendar, Outlook, Apple Calendar, and other iCalendar-compliant applications.

## Changes Summary

### New Files

1. **`app/utils/ics.ts`** - Core ICS generation utilities
   - RFC 5545 compliant iCalendar file generation
   - Vesting date calculation based on stream rate schedules
   - Browser download trigger for ICS files

2. **`app/utils/ics.test.ts`** - Comprehensive test suite
   - Unit tests for all ICS utility functions
   - Integration tests for end-to-end ICS generation
   - Edge case coverage for various stream states

### Modified Files

1. **`app/streams/[id]/StreamDetailClient.tsx`** - Stream detail page component
   - Added ICS export button to Stream Operations section
   - Added `handleExportIcs` function to trigger calendar export
   - Imported `exportStreamVestingAsIcs` utility

## API Reference

### Core Functions

#### `exportStreamVestingAsIcs(streamId, rate, createdAt, status, token, label?)`

Main entry point for exporting stream vesting schedule as ICS file.

**Parameters:**
- `streamId` (string): Unique stream identifier
- `rate` (string): Payment rate in format "120 XLM / month", "32 XLM / week", or "18 XLM / day"
- `createdAt` (string): ISO 8601 timestamp of stream creation
- `status` (string): Stream status ("active", "ended", "cancelled", etc.)
- `token` (string, optional): Token type (default: "XLM")
- `label` (string, optional): Stream label for calendar naming

**Behavior:**
- Calculates future vesting dates based on rate schedule
- Generates RFC 5545 compliant ICS file
- Triggers browser download of the .ics file
- Skips past events and respects stream status (no future events for ended/cancelled streams)

**Example Usage:**
```typescript
exportStreamVestingAsIcs(
  'stream-ada',
  '120 XLM / month',
  '2024-11-01T09:00:00.000Z',
  'active',
  'XLM',
  'Ada Creative Studio'
);
```

#### `calculateVestingDates(streamId, rate, createdAt, status, token?, maxEvents?)`

Calculates vesting event dates based on stream parameters.

**Parameters:**
- `streamId` (string): Unique stream identifier
- `rate` (string): Payment rate string
- `createdAt` (string): Stream creation timestamp
- `status` (string): Current stream status
- `token` (string, optional): Token type (default: "XLM")
- `maxEvents` (number, optional): Maximum number of events to generate (default: 52)

**Returns:** Array of `VestingEvent` objects

**VestingEvent Interface:**
```typescript
interface VestingEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  streamId: string;
  amount?: string;
  token?: string;
}
```

#### `generateIcsFile(events, calendarName?)`

Generates complete ICS file content from vesting events.

**Parameters:**
- `events` (VestingEvent[]): Array of vesting events
- `calendarName` (string, optional): Name for the calendar (default: "StreamPay Vesting Schedule")

**Returns:** RFC 5545 compliant ICS file content as string

#### `parseRate(rate)`

Parses rate string to extract amount and period.

**Parameters:**
- `rate` (string): Rate string in format "120 XLM / month"

**Returns:** `{ amount: string, period: 'day' | 'week' | 'month' }` or `null` if invalid

**Supported Formats:**
- "120 XLM / month" - Monthly payments
- "32 XLM / week" - Weekly payments
- "18 XLM / day" - Daily payments
- Supports decimal amounts: "12.5 XLM / day"
- Flexible spacing: "120XLM/month", "120 XLM/month"

#### `generateIcsFilename(streamId, label?)`

Generates a filename for the ICS export.

**Parameters:**
- `streamId` (string): Stream identifier
- `label` (string, optional): Stream label

**Returns:** Sanitized filename string

**Example:**
```typescript
generateIcsFilename('stream-123', 'Ada Creative Studio')
// Returns: "streampay-vesting-Ada-Creative-Studio.ics"
```

## UI Changes

### Stream Detail Page

A new "Export Calendar (.ics)" button has been added to the Stream Operations section on the stream detail page (`/streams/[id]`).

**Button Location:** 
- Section: Stream Operations
- Position: Third button in the action row
- Style: Secondary button (same as Print Stream Receipt)

**Accessibility:**
- Includes `aria-label="Export vesting calendar as ICS file"`
- Keyboard accessible via Tab navigation
- Error handling with user-friendly alert messages

**Error Handling:**
- Invalid rate format: Shows alert "Failed to export vesting calendar. Please check the stream rate format."
- Console logging for debugging in development mode

## ICS File Format

The generated ICS files follow RFC 5545 specifications and include:

**Calendar Properties:**
- `VERSION:2.0`
- `PRODID:-//StreamPay//Vesting Calendar//EN`
- `CALSCALE:GREGORIAN`
- `METHOD:PUBLISH`
- `X-WR-CALNAME`: Custom calendar name
- `X-WR-TIMEZONE:UTC`

**Event Properties:**
- `UID`: Unique identifier per event
- `DTSTAMP`: Creation timestamp
- `DTSTART`: Event start time (UTC)
- `DTEND`: Event end time (UTC, 1 hour duration)
- `SUMMARY`: Event title (e.g., "Vesting: 120 XLM")
- `DESCRIPTION`: Detailed description with stream info
- `LOCATION`: Optional location field

**Example ICS Output:**
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StreamPay//Vesting Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:StreamPay: Ada Creative Studio
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Stream payment vesting schedule exported from StreamPay
BEGIN:VEVENT
UID:stream-ada-1730472000000@streampay.io
DTSTAMP:20241101T100000Z
DTSTART:20241101T100000Z
DTEND:20241101T110000Z
SUMMARY:Vesting: 120 XLM
DESCRIPTION:Stream stream-ada vesting payment of 120 XLM. Rate: 120 XLM / month
END:VEVENT
END:VCALENDAR
```

## Stream Status Handling

The export function respects stream status:

- **Active Streams**: Generates future vesting events
- **Paused Streams**: Generates future vesting events (assumes resumption)
- **Draft Streams**: Generates future vesting events (assumes activation)
- **Ended Streams**: No future events generated
- **Cancelled Streams**: No future events generated
- **Withdrawn Streams**: No future events generated

Past events are always skipped regardless of stream status.

## Rate Parsing Logic

The rate parser uses regex matching to extract amount and period:

**Pattern:** `/^(\d+(?:\.\d+)?)\s+(\w+)\s*\/\s*(day|week|month)$/i`

**Examples:**
- "120 XLM / month" → { amount: "120", period: "month" }
- "32 XLM / week" → { amount: "32", period: "week" }
- "18 XLM / day" → { amount: "18", period: "day" }
- "12.5 USDC / day" → { amount: "12.5", period: "day" }

**Invalid formats return `null`**, resulting in no events being generated.

## Event Generation Rules

1. **Event Duration**: All events have a 1-hour duration
2. **Timezone**: All times are in UTC for consistency
3. **Event Limit**: Default maximum of 52 events (1 year for weekly streams)
4. **Date Calculation**:
   - Daily: 24 hours between events
   - Weekly: 7 days between events
   - Monthly: 30 days between events (approximate)
5. **Past Events**: Skipped (events with end time < current time)
6. **Future Events**: Generated for active/draft/paused streams only

## Testing

Comprehensive test suite in `app/utils/ics.test.ts` covers:

- Text escaping for ICS special characters
- Date formatting to ICS standard
- UID generation uniqueness
- Rate parsing for various formats
- Vesting date calculation for different periods
- Stream status handling
- ICS file structure validation
- Edge cases (invalid rates, empty events, special characters)

**Run tests:**
```bash
npm test -- app/utils/ics.test.ts
```

## Security Considerations

1. **Client-Side Generation**: All ICS generation happens client-side, no server exposure
2. **No PII in Events**: Stream labels and IDs are included, but no sensitive wallet addresses
3. **Input Validation**: Rate parsing validates format before generation
4. **XSS Prevention**: Text escaping prevents injection in ICS content
5. **No External Dependencies**: Pure JavaScript implementation

## Browser Compatibility

The download functionality uses the Blob API and requires:
- Modern browsers with Blob support (all major browsers)
- JavaScript enabled
- No special permissions required (standard download)

## Future Enhancements

Potential future improvements:
- Custom date range selection
- Recurring event rules (RRULE) instead of individual events
- Timezone selection
- Custom event duration
- Multiple stream export
- Calendar subscription URL (webcal://)
