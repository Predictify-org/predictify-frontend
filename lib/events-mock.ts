import { EventsApiError, type EventsAdapter, type FetchEventsOptions } from "@/lib/events-api"
import { mockEvents } from "@/lib/fixtures/events"

export async function fetchMockEvents(options: FetchEventsOptions) {
  const filtered = mockEvents.filter((event) => {
    if (options.status && event.status !== options.status) return false
    if (options.category?.length && !options.category.includes(event.category)) return false
    if (
      options.search &&
      !event.title.toLowerCase().includes(options.search.trim().toLowerCase())
    ) {
      return false
    }
    return true
  })

  const limit =
    options.limit && Number.isInteger(options.limit) && options.limit > 0
      ? options.limit
      : 20
  const start = options.cursor === undefined || options.cursor === null
    ? 0
    : Number(options.cursor)

  if (
    !Number.isInteger(start) ||
    start < 0 ||
    (options.cursor !== undefined &&
      options.cursor !== null &&
      String(start) !== options.cursor)
  ) {
    throw new EventsApiError("invalid", "Market cursor was invalid.")
  }

  const events = filtered.slice(start, start + limit)
  const end = start + events.length

  return {
    events,
    nextCursor: end < filtered.length ? String(end) : null,
  }
}

export const mockEventsAdapter: EventsAdapter = {
  fetchEvents: fetchMockEvents,
}
