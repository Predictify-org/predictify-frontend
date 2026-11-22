/**
 * error-reporting.ts
 *
 * Pluggable client-side error reporter with Stellar key redaction and
 * bounded payload truncation.
 *
 * Mirrors the swappable-sink pattern in `lib/telemetry.ts`: callers invoke
 * `reportError(...)` and never throw, regardless of reporter failures.
 */

export const MAX_INCIDENT_ID_LENGTH = 128
export const MAX_NAME_LENGTH = 128
export const MAX_MESSAGE_LENGTH = 500
export const MAX_STACK_LENGTH = 4000
export const MAX_COMPONENT_STACK_LENGTH = 2000
export const MAX_ROUTE_LENGTH = 256

export const CLIENT_ERRORS_ENDPOINT = "/api/client-errors"

const STELLAR_PUBLIC_KEY_RE = /G[A-Z2-7]{55}/g
const STELLAR_SECRET_KEY_RE = /S[A-Z2-7]{55}/g

export const REDACTED_PUBLIC_KEY = "[REDACTED_STELLAR_PUBLIC_KEY]"
export const REDACTED_SECRET_KEY = "[REDACTED_STELLAR_SECRET_KEY]"

export interface ErrorReportInput {
  error: unknown
  componentStack?: string | null
  incidentId?: string | null
  route?: string | null
}

export interface ErrorReportPayload {
  incidentId: string
  name: string
  message: string
  stack?: string
  componentStack?: string
  route?: string
  timestamp: string
}

export interface ErrorReporter {
  captureError(payload: ErrorReportPayload): void | Promise<void>
}

/**
 * Mask Stellar public keys (`G` + 55 base32 chars) and secret keys
 * (`S` + 55 base32 chars) so wallet addresses and seeds are never leaked.
 */
export function redactSensitive(text: string): string {
  return text
    .replace(STELLAR_PUBLIC_KEY_RE, REDACTED_PUBLIC_KEY)
    .replace(STELLAR_SECRET_KEY_RE, REDACTED_SECRET_KEY)
}

export function sanitizeField(
  value: string | null | undefined,
  maxLength: number
): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const redacted = redactSensitive(trimmed)
  return redacted.length > maxLength ? redacted.slice(0, maxLength) : redacted
}

export function buildErrorReportPayload(
  input: ErrorReportInput
): ErrorReportPayload {
  const err = input.error
  const rawName =
    err instanceof Error && err.name ? err.name : "Error"
  const rawMessage =
    err instanceof Error
      ? err.message || "Unknown error"
      : typeof err === "string"
        ? err
        : "Unknown error"
  const rawStack = err instanceof Error ? err.stack : undefined

  const incidentId =
    sanitizeField(input.incidentId, MAX_INCIDENT_ID_LENGTH) ?? "unknown"
  const name = sanitizeField(rawName, MAX_NAME_LENGTH) ?? "Error"
  const message =
    sanitizeField(rawMessage, MAX_MESSAGE_LENGTH) ?? "Unknown error"
  const stack = sanitizeField(rawStack, MAX_STACK_LENGTH)
  const componentStack = sanitizeField(
    input.componentStack,
    MAX_COMPONENT_STACK_LENGTH
  )
  const route = sanitizeField(input.route, MAX_ROUTE_LENGTH)

  return {
    incidentId,
    name,
    message,
    ...(stack !== undefined ? { stack } : {}),
    ...(componentStack !== undefined ? { componentStack } : {}),
    ...(route !== undefined ? { route } : {}),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Default production reporter: POSTs JSON to `/api/client-errors` using
 * `navigator.sendBeacon` with a `fetch(..., { keepalive: true })` fallback.
 */
export function createBeaconErrorReporter(
  endpoint: string = CLIENT_ERRORS_ENDPOINT
): ErrorReporter {
  return {
    captureError(payload: ErrorReportPayload): void {
      const body = JSON.stringify(payload)

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([body], { type: "application/json" })
        const sent = navigator.sendBeacon(endpoint, blob)
        if (sent) return
      }

      if (typeof fetch === "function") {
        void fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {
          // Swallow network errors so reporting never disrupts the UI.
        })
      }
    },
  }
}

/** No-op reporter suitable for tests or explicitly disabling reporting. */
export const noopErrorReporter: ErrorReporter = {
  captureError(): void {
    // intentionally empty
  },
}

/** Console reporter for local development. */
export const consoleErrorReporter: ErrorReporter = {
  captureError(payload: ErrorReportPayload): void {
    console.debug("[error-reporting]", payload)
  },
}

function getDefaultErrorReporter(): ErrorReporter {
  if (process.env.NODE_ENV === "production") {
    return createBeaconErrorReporter()
  }
  if (process.env.NODE_ENV === "test") {
    return noopErrorReporter
  }
  return consoleErrorReporter
}

let activeReporter: ErrorReporter | null = null

/**
 * Replace the active error reporter (e.g. with a vendor SDK like Sentry or a
 * test double). Pass `null` to restore the default reporter.
 */
export function setErrorReporter(next: ErrorReporter | null): void {
  activeReporter = next
}

export function getErrorReporter(): ErrorReporter {
  return activeReporter ?? getDefaultErrorReporter()
}

/**
 * Redact, truncate, and forward a client error to the active reporter.
 * Never throws, even if the configured reporter throws synchronously or
 * rejects asynchronously.
 */
export function reportError(input: ErrorReportInput): ErrorReportPayload {
  const payload = buildErrorReportPayload(input)

  try {
    const result = getErrorReporter().captureError(payload)
    if (result && typeof (result as Promise<void>).catch === "function") {
      void (result as Promise<void>).catch(() => {
        // Swallow async reporter failures.
      })
    }
  } catch {
    // Swallow synchronous reporter failures so the error boundary UI never breaks.
  }

  return payload
}
