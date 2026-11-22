import React from "react"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "@/components/error-boundary"
import {
  setErrorReporter,
  type ErrorReportPayload,
} from "@/lib/error-reporting"

function ThrowingChild({ message = "Render crash" }: { message?: string }) {
  throw new Error(message)
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    setErrorReporter(null)
    consoleErrorSpy.mockRestore()
  })

  it("reports exactly once with the same incidentId shown in ErrorRecoveryScreen", () => {
    const captureError = jest.fn<void, [ErrorReportPayload]>()
    setErrorReporter({ captureError })

    render(
      <ErrorBoundary>
        <ThrowingChild message="Boom in widget" />
      </ErrorBoundary>
    )

    expect(captureError).toHaveBeenCalledTimes(1)
    const payload = captureError.mock.calls[0][0]
    expect(payload.incidentId).toBeTruthy()
    expect(payload.incidentId).not.toBe("unknown")
    expect(payload.message).toBe("Boom in widget")
    expect(payload.componentStack).toBeTruthy()

    // The exact same incidentId is displayed in ErrorRecoveryScreen.
    expect(screen.getByText(new RegExp(payload.incidentId))).toBeInTheDocument()
  })

  it("still renders ErrorRecoveryScreen when the configured reporter throws", () => {
    setErrorReporter({
      captureError() {
        throw new Error("Reporter exploded")
      },
    })

    render(
      <ErrorBoundary>
        <ThrowingChild message="Child failed" />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it("does not emit duplicate reports when re-rendered in error state", () => {
    const captureError = jest.fn<void, [ErrorReportPayload]>()
    setErrorReporter({ captureError })

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingChild message="Duplicate render test" />
      </ErrorBoundary>
    )

    rerender(
      <ErrorBoundary>
        <ThrowingChild message="Duplicate render test" />
      </ErrorBoundary>
    )

    expect(captureError).toHaveBeenCalledTimes(1)
  })
})
