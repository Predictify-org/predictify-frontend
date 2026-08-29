/**
 * telemetry.ts
 *
 * Recommendation telemetry, gated on the user's usage-analytics consent.
 *
 * Every event emitted from here is (1) validated and sanitized against a
 * strict schema, (2) suppressed entirely while consent is `false`, and
 * (3) forwarded to a pluggable sink that never receives sensitive data
 * (no wallet addresses, no user identity — only market/category metadata).
 *
 * Invariants
 * ----------
 * - No telemetry is emitted unless `getAnalyticsConsent()` is true.
 * - Invalid input is rejected (returns `false`) and never reaches the sink.
 * - Boundary inputs are clamped deterministically (see sanitize* helpers).
 * - Sink failures are swallowed: a throwing sink never crashes the caller,
 *   and telemetry silently degrades to a no-op instead of failing the UI.
 * - Impression duplicates within the same session are de-duplicated and the
 *   dedup set is size-bounded so memory cannot grow without limit.
 */

import { getAnalyticsConsent } from "@/app/state/consent"

export type RecommendationEventType =
  | "recommendation_impression"
  | "recommendation_click"

export interface RecommendationTelemetryInput {
  type: RecommendationEventType
  marketId: string
  category?: string
  position?: number
  timestamp?: number
}

export interface RecommendationTelemetryEvent {
  type: RecommendationEventType
  marketId: string
  category?: string
  position: number
  timestamp: number
  /** Auto-generated, stable for the lifetime of the tab (page session). */
  sessionId: string
}

export const MAX_MARKET_ID_LENGTH = 128
export const MAX_CATEGORY_LENGTH = 32
export const MAX_POSITION = 999
export const IMPRESSION_DEDUP_CAP = 256

type TelemetrySink = (event: RecommendationTelemetryEvent) => void

/** Default: dev-only console output; production emits nothing until wired to a real sink. */
const defaultSink: TelemetrySink = (event) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[telemetry]", event)
  }
}

let sink: TelemetrySink = defaultSink

/** Replace the sink (used to point telemetry at a real backend or a test spy). */
export function setTelemetrySink(next: TelemetrySink | null): void {
  sink = next ?? defaultSink
}

export function getTelemetrySink(): TelemetrySink {
  return sink
}

/** Non-sensitive module-scoped page-session id, stable per module lifetime. */
let sessionId = createSessionId()

function createSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Reset module-scoped state (used by tests between cases). */
export function resetTelemetrySession(): void {
  sessionId = createSessionId()
  seenImpressions.clear()
  impressionFifo = []
}

// ── sanitization ─────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isEventType(value: unknown): value is RecommendationEventType {
  return value === "recommendation_impression" || value === "recommendation_click"
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed.length > 0 ? trimmed : undefined
}

/** Position is clamped into [0, MAX_POSITION]; invalid input defaults to 0. */
function sanitizePosition(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(Math.floor(value), MAX_POSITION)
}

function sanitizeTimestamp(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return Date.now()
  }
  return Math.floor(value)
}

/**
 * Validate and coerce arbitrary input into a well-formed telemetry event.
 * Returns `null` for invalid input so callers can deterministically treat
 * malformed events as "not emitted". Never throws.
 */
export function sanitizeTelemetryEvent(
  input: unknown
): RecommendationTelemetryEvent | null {
  if (!isRecord(input)) return null

  const type = input.type
  if (!isEventType(type)) return null

  const marketId = sanitizeString(input.marketId, MAX_MARKET_ID_LENGTH)
  if (!marketId) return null

  const category = sanitizeString(input.category, MAX_CATEGORY_LENGTH)

  return {
    type,
    marketId,
    category,
    position: sanitizePosition(input.position),
    timestamp: sanitizeTimestamp(input.timestamp),
    sessionId,
  }
}

// ── impression de-duplication (bounded, FIFO) ───────────────────────────────

const seenImpressions = new Set<string>()
let impressionFifo: string[] = []

function rememberImpression(key: string): void {
  if (seenImpressions.size >= IMPRESSION_DEDUP_CAP) {
    const oldest = impressionFifo.shift()
    if (oldest !== undefined) seenImpressions.delete(oldest)
  }
  seenImpressions.add(key)
  impressionFifo.push(key)
}

/**
 * Emit a recommendation telemetry event.
 *
 * - Returns `true` when the event was dispatched to the sink.
 * - Returns `false` when consent is missing or the input is invalid — the
 *   caller can rely on this for deterministic behaviour in tests/retries.
 *
 * Sink errors are swallowed so telemetry can never break the caller.
 */
export function trackRecommendation(
  input: RecommendationTelemetryInput | unknown
): boolean {
  if (!getAnalyticsConsent()) return false

  const event = sanitizeTelemetryEvent(input)
  if (!event) return false

  try {
    sink(event)
  } catch (error) {
    // Failure-tolerant by design: an unreachable/slow/erroring sink must not
    // corrupt UI state or crash the client. Log locally without payload data.
    console.error("[telemetry] sink error", error instanceof Error ? error.message : "unknown")
  }
  return true
}

/**
 * Emit a recommendation *impression*, de-duplicated per market per session.
 * A second impression of the same market in the same tab is suppressed so
 * re-renders / retries cannot double-count.
 */
export function trackRecommendationImpression(
  input: Omit<RecommendationTelemetryInput, "type"> | unknown
): boolean {
  if (!getAnalyticsConsent()) return false

  const event = sanitizeTelemetryEvent({
    ...(isRecord(input) ? input : {}),
    type: "recommendation_impression",
  })
  if (!event) return false

  const key = `${event.sessionId}:${event.marketId}`
  if (seenImpressions.has(key)) return false

  rememberImpression(key)
  return trackRecommendation(event)
}