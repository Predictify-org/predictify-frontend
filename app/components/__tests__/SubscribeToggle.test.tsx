import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SubscribeToggle } from "../SubscribeToggle"

// Mock sonner toast
const mockToastSuccess = jest.fn()
const mockToastMessage = jest.fn()
const mockToast = jest.fn()

jest.mock("sonner", () => ({
  toast: Object.assign(
    // Direct call: toast("text")
    (...args: unknown[]) => mockToast(...args),
    {
      success: (...args: unknown[]) => mockToastSuccess(...args),
      message: (...args: unknown[]) => mockToastMessage(...args),
    }
  ),
}))

// Mock useReducedMotion
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: jest.fn(() => false),
}))

describe("SubscribeToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- Rendering ---

  it("renders the toggle in unsubscribed state by default", () => {
    render(<SubscribeToggle marketId="market-1" />)
    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    expect(switchEl).toBeInTheDocument()
    expect(switchEl).not.toBeChecked()
  })

  it("renders the toggle in subscribed state when subscribed=true", () => {
    render(<SubscribeToggle marketId="market-1" subscribed={true} />)
    const switchEl = screen.getByRole("switch", {
      name: /unsubscribe from market notifications/i,
    })
    expect(switchEl).toBeInTheDocument()
    expect(switchEl).toBeChecked()
  })

  it("displays custom label when provided", () => {
    render(
      <SubscribeToggle
        marketId="market-1"
        label="Notify me about this market"
      />
    )
    expect(screen.getByText("Notify me about this market")).toBeInTheDocument()
  })

  it("displays default 'Subscribe' text when not subscribed and no label", () => {
    render(<SubscribeToggle marketId="market-1" />)
    expect(screen.getByText("Subscribe")).toBeInTheDocument()
  })

  it("displays default 'Subscribed' text when subscribed and no label", () => {
    render(<SubscribeToggle marketId="market-1" subscribed={true} />)
    expect(screen.getByText("Subscribed")).toBeInTheDocument()
  })

  // --- Bell Icon States ---

  it("shows BellOff icon when not subscribed", () => {
    const { container } = render(<SubscribeToggle marketId="market-1" />)
    // lucide-react renders icons as SVGs; BellOff icon should be present
    const icons = container.querySelectorAll("svg")
    expect(icons.length).toBeGreaterThan(0)
  })

  it("shows Bell icon when subscribed", () => {
    const { container } = render(
      <SubscribeToggle marketId="market-1" subscribed={true} />
    )
    const icons = container.querySelectorAll("svg")
    expect(icons.length).toBeGreaterThan(0)
  })

  // --- Toggle Interaction ---

  it("calls onSubscribeChange with true when toggled on", async () => {
    const onSubscribeChange = jest.fn()
    render(
      <SubscribeToggle
        marketId="market-1"
        subscribed={false}
        onSubscribeChange={onSubscribeChange}
      />
    )

    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(onSubscribeChange).toHaveBeenCalledWith("market-1", true)
  })

  it("calls onSubscribeChange with false when toggled off", async () => {
    const onSubscribeChange = jest.fn()
    render(
      <SubscribeToggle
        marketId="market-abc"
        subscribed={true}
        onSubscribeChange={onSubscribeChange}
      />
    )

    const switchEl = screen.getByRole("switch", {
      name: /unsubscribe from market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(onSubscribeChange).toHaveBeenCalledWith("market-abc", false)
  })

  // --- Toast Notifications ---

  it("shows success toast when subscribing", async () => {
    render(
      <SubscribeToggle
        marketId="market-1"
        marketTitle="NBA Finals"
        subscribed={false}
      />
    )

    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Subscribed to NBA Finals notifications",
      expect.objectContaining({
        description: "We'll notify you when the outcome is resolved.",
      })
    )
  })

  it("shows generic toast when subscribing without marketTitle", async () => {
    render(<SubscribeToggle marketId="market-1" subscribed={false} />)

    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Subscribed to market notifications",
      expect.any(Object)
    )
  })

  it("shows toast when unsubscribing", async () => {
    render(
      <SubscribeToggle
        marketId="market-1"
        subscribed={true}
      />
    )

    const switchEl = screen.getByRole("switch", {
      name: /unsubscribe from market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(mockToastMessage).toHaveBeenCalledWith(
      "Unsubscribed from market notifications",
      expect.objectContaining({
        description: "You will no longer receive updates for this market.",
      })
    )
  })

  // --- Disabled State ---

  it("renders in disabled state when disabled=true", () => {
    render(<SubscribeToggle marketId="market-1" disabled={true} />)
    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    expect(switchEl).toBeDisabled()
  })

  it("does not call onSubscribeChange when disabled", async () => {
    const onSubscribeChange = jest.fn()
    render(
      <SubscribeToggle
        marketId="market-1"
        disabled={true}
        onSubscribeChange={onSubscribeChange}
      />
    )

    const switchEl = screen.getByRole("switch", {
      name: /subscribe to market notifications/i,
    })
    await userEvent.click(switchEl)

    expect(onSubscribeChange).not.toHaveBeenCalled()
  })

  it("applies opacity-50 and pointer-events-none classes when disabled", () => {
    const { container } = render(
      <SubscribeToggle marketId="market-1" disabled={true} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("opacity-50")
    expect(wrapper).toHaveClass("pointer-events-none")
  })

  // --- Accessibility ---

  it("has accessible switch role", () => {
    render(<SubscribeToggle marketId="market-1" />)
    expect(
      screen.getByRole("switch", {
        name: /subscribe to market notifications/i,
      })
    ).toBeInTheDocument()
  })

  it("has aria-label that updates based on subscription state", () => {
    const { rerender } = render(
      <SubscribeToggle marketId="market-1" subscribed={false} />
    )
    expect(
      screen.getByRole("switch", {
        name: /subscribe to market notifications/i,
      })
    ).toBeInTheDocument()

    rerender(<SubscribeToggle marketId="market-1" subscribed={true} />)
    expect(
      screen.getByRole("switch", {
        name: /unsubscribe from market notifications/i,
      })
    ).toBeInTheDocument()
  })

  it("has a live region for screen reader announcements", () => {
    render(<SubscribeToggle marketId="market-1" />)
    const liveRegion = screen.getByRole("status")
    expect(liveRegion).toHaveAttribute("aria-live", "polite")
    expect(liveRegion).toHaveClass("sr-only")
  })

  it("announces subscribed state in the live region", () => {
    render(
      <SubscribeToggle marketId="market-1" marketTitle="Test Market" subscribed={true} />
    )
    const liveRegion = screen.getByRole("status")
    expect(liveRegion.textContent).toContain("Subscribed to Test Market notifications")
  })

  it("announces unsubscribed state in the live region", () => {
    render(
      <SubscribeToggle marketId="market-1" marketTitle="Test Market" subscribed={false} />
    )
    const liveRegion = screen.getByRole("status")
    expect(liveRegion.textContent).toContain("Not subscribed to Test Market notifications")
  })

  it("announces generic market text when no marketTitle provided", () => {
    render(<SubscribeToggle marketId="market-1" subscribed={false} />)
    const liveRegion = screen.getByRole("status")
    expect(liveRegion.textContent).toContain("Not subscribed to market notifications")
  })

  // --- Custom className ---

  it("accepts and applies custom className", () => {
    const { container } = render(
      <SubscribeToggle marketId="market-1" className="my-custom-class" />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("my-custom-class")
  })

  // --- Responsive classes ---

  it("applies responsive width classes", () => {
    const { container } = render(<SubscribeToggle marketId="market-1" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("w-full")
    expect(wrapper).toHaveClass("sm:w-auto")
  })
})
