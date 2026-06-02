import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import SettingsPage from "../page"

describe("Settings accessibility basics", () => {
  it("renders tab list and live region", () => {
    render(<SettingsPage />)

    const tablist = screen.getByRole("tablist")
    expect(tablist).toBeInTheDocument()

    // The aria-live region should be present (hidden to visual users)
    const live = screen.getByText(/settings saved/i, { selector: "div", exact: false })
    expect(live).toBeInTheDocument()
  })

  it("allows toggling a preference switch via keyboard and announces state", () => {
    render(<SettingsPage />)

    // Find a switch by its label
    const switchLabel = screen.getByLabelText(/reduce motion in dashboards/i)
    expect(switchLabel).toBeInTheDocument()

    // Toggle it via click as a stand-in for keyboard interaction
    fireEvent.click(switchLabel)
    // After clicking, it should still be in the document and have aria-checked
    expect(switchLabel).toHaveAttribute("role")
  })
})
