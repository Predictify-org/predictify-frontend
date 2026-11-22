/** @jest-environment node */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/client-errors/route"
import {
  REDACTED_PUBLIC_KEY,
  REDACTED_SECRET_KEY,
} from "@/lib/error-reporting"

const SAMPLE_PUBLIC_KEY = "G" + "C".repeat(55)
const SAMPLE_SECRET_KEY = "S" + "D".repeat(55)

let ipCounter = 1
function nextIp(): string {
  ipCounter += 1
  return `198.51.100.${ipCounter}`
}

function makeRequest(
  body: string,
  options: { contentType?: string; ip?: string; contentLength?: string } = {}
): NextRequest {
  const headers = new Headers()
  if (options.contentType !== undefined) {
    headers.set("content-type", options.contentType)
  }
  headers.set("x-forwarded-for", options.ip ?? nextIp())
  if (options.contentLength !== undefined) {
    headers.set("content-length", options.contentLength)
  }

  return new NextRequest("http://localhost/api/client-errors", {
    method: "POST",
    headers,
    body,
  })
}

describe("POST /api/client-errors", () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("accepts a valid payload, redacts Stellar keys server-side, logs a single structured line, and returns 204", async () => {
    const req = makeRequest(
      JSON.stringify({
        incidentId: "inc-42",
        name: "TypeError",
        message: `Tx failed for ${SAMPLE_PUBLIC_KEY} with ${SAMPLE_SECRET_KEY}`,
        stack: `TypeError: boom\n  at sign (${SAMPLE_SECRET_KEY})`,
        componentStack: `\n    at Wallet (${SAMPLE_PUBLIC_KEY})`,
        route: `/wallet/${SAMPLE_PUBLIC_KEY}`,
      }),
      { contentType: "application/json; charset=utf-8" }
    )

    const res = await POST(req)

    expect(res.status).toBe(204)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

    const loggedLine = consoleErrorSpy.mock.calls[0][0] as string
    expect(loggedLine).not.toContain(SAMPLE_PUBLIC_KEY)
    expect(loggedLine).not.toContain(SAMPLE_SECRET_KEY)

    const parsed = JSON.parse(loggedLine)
    expect(parsed.event).toBe("client_error")
    expect(parsed.incidentId).toBe("inc-42")
    expect(parsed.message).toContain(REDACTED_PUBLIC_KEY)
    expect(parsed.message).toContain(REDACTED_SECRET_KEY)
    expect(parsed.stack).toContain(REDACTED_SECRET_KEY)
    expect(parsed.componentStack).toContain(REDACTED_PUBLIC_KEY)
  })

  it("returns 415 for non-JSON content-type and never logs", async () => {
    const req = makeRequest(
      JSON.stringify({ incidentId: "inc-1", message: "hello" }),
      { contentType: "text/plain" }
    )

    const res = await POST(req)

    expect(res.status).toBe(415)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("returns 413 for a 9 KB body and never logs", async () => {
    const oversized = JSON.stringify({
      incidentId: "inc-big",
      message: "a".repeat(9 * 1024),
    })
    const req = makeRequest(oversized, { contentType: "application/json" })

    const res = await POST(req)

    expect(res.status).toBe(413)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("returns 400 for malformed JSON and never logs", async () => {
    const req = makeRequest("{not-valid-json", {
      contentType: "application/json",
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid schema (missing required fields) and never logs", async () => {
    const req = makeRequest(JSON.stringify({ route: "/dashboard" }), {
      contentType: "application/json",
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("throttles excessive requests from the same IP with 429", async () => {
    const ip = "203.0.113.77"
    const validBody = JSON.stringify({
      incidentId: "inc-flood",
      message: "repeated error",
    })

    for (let i = 0; i < 20; i++) {
      const res = await POST(
        makeRequest(validBody, { contentType: "application/json", ip })
      )
      expect(res.status).toBe(204)
    }

    const throttled = await POST(
      makeRequest(validBody, { contentType: "application/json", ip })
    )
    expect(throttled.status).toBe(429)
    expect(throttled.headers.get("Retry-After")).toBeTruthy()
  })
})
