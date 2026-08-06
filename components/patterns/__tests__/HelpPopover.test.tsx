import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { HelpPopover } from "./HelpPopover"

describe("HelpPopover", () => {
  const defaultProps = {
    title: "Display preferences",
    description: "Controls how the interface looks and feels.",
  }

  it("renders a help trigger button with accessible label", () => {
    render(<HelpPopover {...defaultProps} />)
    const trigger = screen.getByRole("button", { name: /help: display preferences/i })
    expect(trigger).toBeInTheDocument()
  })

  it("shows the title and description when the trigger is clicked", () => {
    render(<HelpPopover {...defaultProps} />)
    const trigger = screen.getByRole("button", { name: /help: display preferences/i })
    fireEvent.click(trigger)

    expect(screen.getByText("Display preferences")).toBeInTheDocument()
    expect(screen.getByText("Controls how the interface looks and feels.")).toBeInTheDocument()
  })

  it("renders optional tips when provided", () => {
    const tips = ["Tip one", "Tip two"]
    render(<HelpPopover {...defaultProps} tips={tips} />)

    const trigger = screen.getByRole("button", { name: /help: display preferences/i })
    fireEvent.click(trigger)

    expect(screen.getByText("Tip one")).toBeInTheDocument()
    expect(screen.getByText("Tip two")).toBeInTheDocument()
  })

  it("does not render the tips section when tips are empty", () => {
    render(<HelpPopover {...defaultProps} />)
    const trigger = screen.getByRole("button", { name: /help: display preferences/i })
    fireEvent.click(trigger)

    expect(screen.queryByText(/tips for first-time users/i)).not.toBeInTheDocument()
  })

  it("uses the HelpCircle icon for the trigger", () => {
    render(<HelpPopover {...defaultProps} />)
    const trigger = screen.getByRole("button", { name: /help: display preferences/i })
    // The icon is rendered inside the button
    expect(trigger.querySelector("svg")).toBeInTheDocument()
  })
})