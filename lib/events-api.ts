import { z } from "zod"
import { config } from "@/lib/config"
import type { Event } from "@/types/events"

export type EventsLoadErrorKind = "invalid" | "network" | "permission"

export interface FetchEventsOptions {
  status?: Event["status"]
  category?: readonly string[]
  search?: string
  cursor?: string | null
  limit?: number
  signal?: AbortSignal
}

export interface EventsPage {
  events: Event[]
  nextCursor: string | null
}

export interface EventsAdapter {
  fetchEvents: (options: FetchEventsOptions) => Promise<EventsPage>
}

export class EventsApiError extends Error {
  constructor(
    public readonly kind: EventsLoadErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "EventsApiError"
  }
}

const isDateString = (value: string) => Number.isFinite(Date.parse(value))

const eventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  txHash: z.string(),
  category: z.enum(["Football", "Politics", "Crypto", "Stocks"]),
  odds: z.number().finite(),
  startDate: z.string().refine(isDateString),
  endDate: z.string().refine(isDateString),
  status: z.enum(["ongoing", "upcoming", "past"]),
  timeRemaining: z.string().optional(),
  timeRemainingMs: z.number().finite().optional(),
  participants: z.number().int().nonnegative(),
})

const eventsPageSchema = z.object({
  events: z.array(eventSchema),
  nextCursor: z.string().nullable().optional(),
})

function buildEventsUrl(options: FetchEventsOptions): string {
  const url = new URL(`${config.api.url.replace(/\/+$/, "")}/events`)
  if (options.status) url.searchParams.set("status", options.status)
  for (const category of options.category ?? []) {
    url.searchParams.append("category", category)
  }
  if (options.search) url.searchParams.set("search", options.search)
  if (options.cursor) url.searchParams.set("cursor", options.cursor)
  if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit))
  return url.toString()
}

export async function fetchEvents(options: FetchEventsOptions): Promise<EventsPage> {
  let response: Response
  try {
    response = await fetch(buildEventsUrl(options), { signal: options.signal })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error
    throw new EventsApiError("network", "Could not load markets.")
  }

  if (!response.ok) {
    const kind =
      response.status === 401 || response.status === 403
        ? "permission"
        : response.status === 400 || response.status === 422
          ? "invalid"
          : "network"
    throw new EventsApiError(kind, "Could not load markets.", response.status)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new EventsApiError("invalid", "Market response was not valid JSON.")
  }

  const parsed = eventsPageSchema.safeParse(payload)
  if (!parsed.success) {
    throw new EventsApiError("invalid", "Market response had an invalid shape.")
  }

  return {
    events: parsed.data.events,
    nextCursor: parsed.data.nextCursor ?? null,
  }
}

const apiAdapter: EventsAdapter = { fetchEvents }

export async function getEventsAdapter(): Promise<EventsAdapter> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PUBLIC_USE_MOCKS === "true"
  ) {
    const { mockEventsAdapter } = await import("@/lib/events-mock")
    return mockEventsAdapter
  }

  return apiAdapter
}
