import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  MAX_COMPONENT_STACK_LENGTH,
  MAX_INCIDENT_ID_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ROUTE_LENGTH,
  MAX_STACK_LENGTH,
  sanitizeField,
} from "@/lib/error-reporting"

const MAX_BODY_BYTES = 8 * 1024 // 8 KB
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20
const RATE_LIMIT_MAX_KEYS = 1000

const clientErrorSchema = z.object({
  incidentId: z.string().trim().min(1).max(MAX_INCIDENT_ID_LENGTH),
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH).optional().default("Error"),
  message: z.string().trim().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(4000).optional(),
  route: z.string().max(512).optional(),
  timestamp: z.string().max(64).optional(),
})

interface RateLimitBucket {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitBucket>()

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "anonymous"
}

function isRateLimited(key: string, now: number = Date.now()): boolean {
  const existing = rateLimitStore.get(key)
  if (!existing || now >= existing.resetAt) {
    if (rateLimitStore.size >= RATE_LIMIT_MAX_KEYS) {
      // Evict the oldest entry to keep memory bounded.
      const oldestKey = rateLimitStore.keys().next().value
      if (oldestKey !== undefined) {
        rateLimitStore.delete(oldestKey)
      }
    }
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  existing.count += 1
  return existing.count > RATE_LIMIT_MAX_REQUESTS
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type" },
      { status: 415 }
    )
  }

  const contentLengthHeader = request.headers.get("content-length")
  if (contentLengthHeader !== null) {
    const declaredLength = Number(contentLengthHeader)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload Too Large" },
        { status: 413 }
      )
    }
  }

  const clientKey = getClientKey(request)
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) },
      }
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload Too Large" },
      { status: 413 }
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 })
  }

  const parsed = clientErrorSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const data = parsed.data

  const sanitized = {
    event: "client_error",
    incidentId:
      sanitizeField(data.incidentId, MAX_INCIDENT_ID_LENGTH) ?? "unknown",
    name: sanitizeField(data.name, MAX_NAME_LENGTH) ?? "Error",
    message: sanitizeField(data.message, MAX_MESSAGE_LENGTH) ?? "Unknown error",
    ...(data.stack !== undefined
      ? { stack: sanitizeField(data.stack, MAX_STACK_LENGTH) }
      : {}),
    ...(data.componentStack !== undefined
      ? {
          componentStack: sanitizeField(
            data.componentStack,
            MAX_COMPONENT_STACK_LENGTH
          ),
        }
      : {}),
    ...(data.route !== undefined
      ? { route: sanitizeField(data.route, MAX_ROUTE_LENGTH) }
      : {}),
    timestamp: data.timestamp ?? new Date().toISOString(),
  }

  // Single structured log line with no PII (no IP, no user-agent, no raw Stellar keys).
  console.error(JSON.stringify(sanitized))

  return new NextResponse(null, { status: 204 })
}
