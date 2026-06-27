import React from "react"
import { render, screen, act } from "@testing-library/react"
import { Timestamp } from "../Timestamp"

describe("Timestamp", () => {
  it("renders relative time text", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    render(<Timestamp date={date} />)
    expect(screen.getByText("5 minutes ago")).toBeInTheDocument()
  })

  it("renders <time> element with dateTime attribute", () => {
    const date = new Date("2026-06-27T12:00:00Z")
    render(<Timestamp date={date} />)
    const time = screen.getByRole("time")
    expect(time).toBeInTheDocument()
    expect(time).toHaveAttribute("dateTime", date.toISOString())
  })

  it("aria-label includes both relative and absolute time", () => {
    const date = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    render(<Timestamp date={date} />)
    const time = screen.getByRole("time")
    const label = time.getAttribute("aria-label") ?? ""
    expect(label).toMatch(/hour ago/)
    expect(label).toMatch(/\d{1,2}:\d{2}/) // absolute time contains HH:MM
  })

  it("parses DD/MM/YYYY format correctly", () => {
    render(<Timestamp date="27/06/2026" />)
    const time = screen.getByRole("time")
    const iso = time.getAttribute("dateTime") ?? ""
    // new Date(2026, 5, 27) creates local midnight, which may differ in UTC
    expect(iso).toMatch(/^2026-06-2[67]T/) // UTC offset may shift date
  })

  it("parses ISO string format correctly", () => {
    render(<Timestamp date="2026-06-27T10:30:00Z" />)
    const time = screen.getByRole("time")
    expect(time.getAttribute("dateTime")).toBe("2026-06-27T10:30:00.000Z")
  })

  it("updates relative text after interval", () => {
    jest.useFakeTimers()
    const date = new Date(Date.now() - 30 * 1000) // 30 seconds ago
    render(<Timestamp date={date} />)

    expect(screen.getByText("Just now")).toBeInTheDocument()

    // Advance 61 seconds — "Just now" should become "1 minute ago"
    act(() => {
      jest.advanceTimersByTime(61000)
    })
    expect(screen.getByText("1 minute ago")).toBeInTheDocument()

    jest.useRealTimers()
  })

  it("clears interval on unmount", () => {
    jest.useFakeTimers()
    const clearIntervalSpy = jest.spyOn(global, "clearInterval")
    const { unmount } = render(<Timestamp date={new Date()} />)

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
    jest.useRealTimers()
  })
})
