import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ShareSheet } from "../ShareSheet"

const defaultProps = {
  title: "Test Market",
  text: "Check out Test Market on Predictify!",
  url: "https://predictify.app/events/1",
}

describe("ShareSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the default trigger button", () => {
    render(<ShareSheet {...defaultProps} />)
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument()
  })

  it("renders custom trigger when provided", () => {
    render(<ShareSheet {...defaultProps} trigger={<button>Custom Trigger</button>} />)
    expect(screen.getByRole("button", { name: /custom trigger/i })).toBeInTheDocument()
  })

  it("opens the sheet when trigger is clicked", () => {
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Share this prediction market with others.")).toBeInTheDocument()
  })

  it("displays the title and URL in the sheet", () => {
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    expect(screen.getByText("Test Market")).toBeInTheDocument()
    expect(screen.getByText("https://predictify.app/events/1")).toBeInTheDocument()
  })

  it("shows native share button when navigator.share is available", () => {
    Object.defineProperty(navigator, "share", {
      value: jest.fn(),
      configurable: true,
      writable: true,
    })
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    const shareButtons = screen.getAllByRole("button")
    const nativeShareBtn = shareButtons.find((btn) => btn.textContent === "Share")
    expect(nativeShareBtn).toBeInTheDocument()
  })

  it("hides native share button when navigator.share is unavailable", () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    })
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    const dialog = screen.getByRole("dialog")
    const dialogButtons = Array.from(dialog.querySelectorAll("button")).map((b) => b.textContent?.trim())
    const nativeShareLabels = dialogButtons.filter((t) => t === "Share")
    expect(nativeShareLabels).toHaveLength(0)
  })

  it("calls navigator.share when native share button is clicked", async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    })
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))

    const dialog = screen.getByRole("dialog")
    const nativeShareBtn = Array.from(dialog.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Share"
    )
    if (nativeShareBtn) {
      fireEvent.click(nativeShareBtn)
      await waitFor(() => {
        expect(shareMock).toHaveBeenCalledWith({
          title: "Test Market",
          text: "Check out Test Market on Predictify!",
          url: "https://predictify.app/events/1",
        })
      })
    }
  })

  it("copies URL to clipboard when Copy Link is clicked", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))

    const dialog = screen.getByRole("dialog")
    const copyBtn = Array.from(dialog.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Copy Link"
    )
    if (copyBtn) {
      fireEvent.click(copyBtn)
      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith("https://predictify.app/events/1")
      })
    }
  })

  it("shows social platform buttons", () => {
    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))
    expect(screen.getByText("X")).toBeInTheDocument()
    expect(screen.getByText("Farcaster")).toBeInTheDocument()
    expect(screen.getByText("Bluesky")).toBeInTheDocument()
  })

  it("opens social platform URLs in new tabs", () => {
    const openMock = jest.fn()
    window.open = openMock

    render(<ShareSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share/i }))

    const dialog = screen.getByRole("dialog")
    const xBtn = Array.from(dialog.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "X"
    )
    if (xBtn) {
      fireEvent.click(xBtn)
      expect(openMock).toHaveBeenCalledWith(
        expect.stringContaining("twitter.com/intent/tweet"),
        "_blank",
        "noopener,noreferrer"
      )
    }
  })

  it("applies custom className to trigger", () => {
    render(<ShareSheet {...defaultProps} className="custom-class" />)
    const trigger = screen.getByRole("button", { name: /share/i })
    expect(trigger).toHaveClass("custom-class")
  })
})
