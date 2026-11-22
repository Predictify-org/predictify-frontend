import {
  CLIENT_ERRORS_ENDPOINT,
  MAX_COMPONENT_STACK_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_LENGTH,
  REDACTED_PUBLIC_KEY,
  REDACTED_SECRET_KEY,
  buildErrorReportPayload,
  createBeaconErrorReporter,
  getErrorReporter,
  noopErrorReporter,
  redactSensitive,
  reportError,
  setErrorReporter,
  type ErrorReporter,
} from "@/lib/error-reporting"

const SAMPLE_PUBLIC_KEY = "G" + "A".repeat(55)
const SAMPLE_SECRET_KEY = "S" + "B".repeat(55)

describe("lib/error-reporting", () => {
  afterEach(() => {
    setErrorReporter(null)
    jest.restoreAllMocks()
  })

  describe("redactSensitive", () => {
    it("masks Stellar public and secret keys embedded in text", () => {
      const input = `Wallet ${SAMPLE_PUBLIC_KEY} failed signing with ${SAMPLE_SECRET_KEY}`
      const output = redactSensitive(input)

      expect(output).not.toContain(SAMPLE_PUBLIC_KEY)
      expect(output).not.toContain(SAMPLE_SECRET_KEY)
      expect(output).toBe(
        `Wallet ${REDACTED_PUBLIC_KEY} failed signing with ${REDACTED_SECRET_KEY}`
      )
    })

    it("leaves normal text and shorter G/S strings untouched", () => {
      const input = "Failed to load market G12345 and S98765"
      expect(redactSensitive(input)).toBe(input)
    })
  })

  describe("buildErrorReportPayload", () => {
    it("redacts keys and truncates message, stack, and componentStack to fixed limits", () => {
      const err = new Error(`${SAMPLE_PUBLIC_KEY} ${"x".repeat(MAX_MESSAGE_LENGTH + 200)}`)
      err.stack = `Error: ${SAMPLE_SECRET_KEY}\n${"at fn (file.ts:1:1)\n".repeat(400)}`

      const payload = buildErrorReportPayload({
        error: err,
        componentStack: `\n    in Component (${SAMPLE_PUBLIC_KEY})\n`.repeat(100),
        incidentId: "inc-123",
        route: "/dashboard",
      })

      expect(payload.incidentId).toBe("inc-123")
      expect(payload.route).toBe("/dashboard")
      expect(payload.message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH)
      expect(payload.stack!.length).toBeLessThanOrEqual(MAX_STACK_LENGTH)
      expect(payload.componentStack!.length).toBeLessThanOrEqual(MAX_COMPONENT_STACK_LENGTH)
      expect(payload.message).not.toContain(SAMPLE_PUBLIC_KEY)
      expect(payload.stack).not.toContain(SAMPLE_SECRET_KEY)
      expect(payload.componentStack).not.toContain(SAMPLE_PUBLIC_KEY)
    })

    it("handles an error with no stack", () => {
      const err = new Error("No stack error")
      err.stack = undefined

      const payload = buildErrorReportPayload({
        error: err,
        incidentId: "inc-no-stack",
      })

      expect(payload.incidentId).toBe("inc-no-stack")
      expect(payload.message).toBe("No stack error")
      expect(payload.stack).toBeUndefined()
    })
  })

  describe("setErrorReporter / getErrorReporter / reportError", () => {
    it("defaults to noopErrorReporter in test environment and can be swapped and reset", () => {
      expect(getErrorReporter()).toBe(noopErrorReporter)

      const custom: ErrorReporter = { captureError: jest.fn() }
      setErrorReporter(custom)
      expect(getErrorReporter()).toBe(custom)

      setErrorReporter(null)
      expect(getErrorReporter()).toBe(noopErrorReporter)
    })

    it("never throws when the reporter throws synchronously or rejects asynchronously", () => {
      setErrorReporter({
        captureError() {
          throw new Error("sync boom")
        },
      })
      expect(() =>
        reportError({ error: new Error("ui crash"), incidentId: "inc-sync" })
      ).not.toThrow()

      setErrorReporter({
        captureError() {
          return Promise.reject(new Error("async boom"))
        },
      })
      expect(() =>
        reportError({ error: new Error("ui crash"), incidentId: "inc-async" })
      ).not.toThrow()
    })
  })

  describe("createBeaconErrorReporter", () => {
    it("uses navigator.sendBeacon with a JSON Blob when available", () => {
      const sendBeacon = jest.fn().mockReturnValue(true)
      Object.defineProperty(navigator, "sendBeacon", {
        value: sendBeacon,
        configurable: true,
        writable: true,
      })

      const reporter = createBeaconErrorReporter()
      const payload = buildErrorReportPayload({
        error: new Error("beacon test"),
        incidentId: "inc-beacon",
      })
      reporter.captureError(payload)

      expect(sendBeacon).toHaveBeenCalledTimes(1)
      expect(sendBeacon).toHaveBeenCalledWith(
        CLIENT_ERRORS_ENDPOINT,
        expect.any(Blob)
      )
      const blob = sendBeacon.mock.calls[0][1] as Blob
      expect(blob.type).toMatch(/^application\/json/)
    })

    it("falls back to fetch(keepalive) when navigator.sendBeacon is undefined", () => {
      Object.defineProperty(navigator, "sendBeacon", {
        value: undefined,
        configurable: true,
        writable: true,
      })

      const fetchMock = jest.fn().mockResolvedValue({ ok: true })
      global.fetch = fetchMock as unknown as typeof fetch

      const reporter = createBeaconErrorReporter()
      const payload = buildErrorReportPayload({
        error: new Error("fetch fallback"),
        incidentId: "inc-fetch",
      })
      reporter.captureError(payload)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        CLIENT_ERRORS_ENDPOINT,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(payload),
        })
      )
    })
  })
})
