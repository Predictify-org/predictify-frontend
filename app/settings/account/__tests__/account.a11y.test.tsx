import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AccountSettingsPage from "../page"

describe("Settings → Account page accessibility", () => {
  it("renders main heading and tab list with correct roles", () => {
    render(<AccountSettingsPage />)

    // Page heading
    expect(
      screen.getByRole("heading", { name: /account settings/i })
    ).toBeInTheDocument()

    // Tab list
    const tablist = screen.getByRole("tablist", { name: /account settings sections/i })
    expect(tablist).toBeInTheDocument()

    // Both tabs present
    expect(screen.getByRole("tab", { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /privacy/i })).toBeInTheDocument()
  })

  it("profile form fields are labelled and reachable via label click", () => {
    render(<AccountSettingsPage />)

    // Inputs linked to labels
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/short bio/i)).toBeInTheDocument()
  })

  it("bio character counter updates live as user types", () => {
    render(<AccountSettingsPage />)

    const bio = screen.getByLabelText(/short bio/i)
    fireEvent.change(bio, { target: { value: "Hello world" } })

    expect(screen.getByText(/11\/200 used/i)).toBeInTheDocument()
  })

  it("privacy switches are labelled and togglable", () => {
    render(<AccountSettingsPage />)

    // Switch to Privacy tab
    const privacyTab = screen.getByRole("tab", { name: /privacy/i })
    fireEvent.click(privacyTab)

    // Public profile switch
    const publicSwitch = screen.getByRole("switch", { name: /public profile/i })
    expect(publicSwitch).toBeInTheDocument()

    // Toggle off
    const initialChecked = publicSwitch.getAttribute("aria-checked")
    fireEvent.click(publicSwitch)
    expect(publicSwitch.getAttribute("aria-checked")).not.toBe(initialChecked)
  })
})
