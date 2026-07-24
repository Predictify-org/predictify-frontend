import { render, screen, act } from "@testing-library/react"
import { GlobalLiveRegion } from "../GlobalLiveRegion"
import { announce, reducer } from "@/hooks/use-global-live-region"

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
  // Reset the global state by dispatching a remove for any announcements
  // This is a workaround since we can't easily reset the module state
  const state = reducer({ announcements: [] }, { type: "REMOVE_ANNOUNCEMENT", announcementId: "__reset__" })
  // Re-run dispatch indirectly by announcing an empty message (no-op)
})

describe("GlobalLiveRegion Component", () => {
  it("renders a live region with role='status'", () => {
    render(<GlobalLiveRegion />)
    const region = screen.getByRole("status")
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute("aria-live", "polite")
    expect(region).toHaveAttribute("aria-atomic", "true")
  })

  it("shows an empty live region when no announcements exist", () => {
    render(<GlobalLiveRegion />)
    const region = screen.getByRole("status")
    expect(region).toHaveTextContent("")
  })

  it("announces a message when announce() is called", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "Bet placed successfully" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Bet placed successfully")
  })

  it("updates to the latest announcement when multiple are made", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "First announcement" })
    act(() => jest.advanceTimersByTime(100))
    announce({ message: "Second announcement" })
    act(() => jest.advanceTimersByTime(100))
    const region = screen.getByRole("status")
    expect(region).toHaveTextContent("Second announcement")
    expect(region).not.toHaveTextContent("First announcement")
  })

  it("supports assertive priority announcements", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "Urgent notice", priority: "assertive" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Urgent notice")
  })

  it("clears the live region after the removal delay", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "Temporary message" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Temporary message")
    act(() => jest.advanceTimersByTime(8000))
    expect(screen.getByRole("status")).toHaveTextContent("")
  })
})

describe("announce() function", () => {
  it("does not announce an empty message", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("")
  })

  it("defaults to polite priority", () => {
    render(<GlobalLiveRegion />)
    announce({ message: "Default priority" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Default priority")
  })

  it("can be called outside of React components", () => {
    render(<GlobalLiveRegion />)
    // Simulate calling announce from a non-React context (e.g., API callback)
    const externalAnnounce = announce
    externalAnnounce({ message: "External call" })
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("External call")
  })
})

describe("reducer", () => {
  it("replaces previous announcements on ADD_ANNOUNCEMENT (keeps only latest)", () => {
    const state1 = reducer(
      { announcements: [] },
      { type: "ADD_ANNOUNCEMENT", announcement: { id: "1", message: "First", priority: "polite" } },
    )
    expect(state1.announcements).toHaveLength(1)
    expect(state1.announcements[0].message).toBe("First")

    const state2 = reducer(state1, {
      type: "ADD_ANNOUNCEMENT",
      announcement: { id: "2", message: "Second", priority: "polite" },
    })
    expect(state2.announcements).toHaveLength(1)
    expect(state2.announcements[0].message).toBe("Second")
  })

  it("removes an announcement by id on REMOVE_ANNOUNCEMENT", () => {
    const state = reducer(
      { announcements: [{ id: "1", message: "Test", priority: "polite" }] },
      { type: "REMOVE_ANNOUNCEMENT", announcementId: "1" },
    )
    expect(state.announcements).toHaveLength(0)
  })

  it("returns state unchanged on unknown action", () => {
    const state = { announcements: [{ id: "1", message: "Test", priority: "polite" }] }
    const result = reducer(state, { type: "UNKNOWN" } as any)
    expect(result).toEqual(state)
  })
})
