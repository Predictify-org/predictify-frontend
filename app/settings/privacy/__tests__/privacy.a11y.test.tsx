import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PrivacySettingsPage from "../page"

describe("Settings → Privacy page", () => {
  it("renders the page heading and description", () => {
    render(<PrivacySettingsPage />)

    expect(
      screen.getByRole("heading", { name: /privacy/i })
    ).toBeInTheDocument()

    expect(
      screen.getByText(/control your public profile visibility/i)
    ).toBeInTheDocument()
  })

  it("renders all five privacy switches with correct labels", () => {
    render(<PrivacySettingsPage />)

    expect(screen.getByLabelText(/public profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/show recent activity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/appear on leaderboards/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/show wallet balance on profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/allow usage analytics/i)).toBeInTheDocument()
  })

  it("switches have correct default states (public on, analytics off)", () => {
    render(<PrivacySettingsPage />)

    const publicProfile = screen.getByRole("switch", { name: /public profile/i })
    const analytics = screen.getByRole("switch", { name: /allow usage analytics/i })

    expect(publicProfile).toBeChecked()
    expect(analytics).not.toBeChecked()
  })

  it("toggling a switch updates its checked state", () => {
    render(<PrivacySettingsPage />)

    const publicProfile = screen.getByRole("switch", { name: /public profile/i })
    expect(publicProfile).toBeChecked()

    fireEvent.click(publicProfile)
    expect(publicProfile).not.toBeChecked()

    fireEvent.click(publicProfile)
    expect(publicProfile).toBeChecked()
  })

  it("description paragraph is linked to each toggle via aria-describedby", () => {
    render(<PrivacySettingsPage />)

    const switches = screen.getAllByRole("switch")
    switches.forEach((toggle) => {
      const describedBy = toggle.getAttribute("aria-describedby")
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy!)).toBeInTheDocument()
    })
  })

  it("save button is present and clickable", () => {
    render(<PrivacySettingsPage />)

    const saveButton = screen.getByRole("button", { name: /save privacy settings/i })
    expect(saveButton).toBeInTheDocument()
    expect(saveButton).not.toBeDisabled()
  })

  it("reset defaults button restores initial states", () => {
    render(<PrivacySettingsPage />)

    const publicProfile = screen.getByRole("switch", { name: /public profile/i })
    const analytics = screen.getByRole("switch", { name: /allow usage analytics/i })

    fireEvent.click(publicProfile)
    fireEvent.click(analytics)

    expect(publicProfile).not.toBeChecked()
    expect(analytics).toBeChecked()

    const resetButton = screen.getByRole("button", { name: /reset defaults/i })
    fireEvent.click(resetButton)

    expect(publicProfile).toBeChecked()
    expect(analytics).not.toBeChecked()
  })

  it("shows success alert after saving", async () => {
    render(<PrivacySettingsPage />)

    const saveButton = screen.getByRole("button", { name: /save privacy settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getAllByText(/privacy settings saved successfully/i)[0]).toBeInTheDocument()
    })
  })

  it("live region announces saved state for screen readers", async () => {
    render(<PrivacySettingsPage />)

    const saveButton = screen.getByRole("button", { name: /save privacy settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion?.textContent).toContain("saved successfully")
    })
  })

  it("each switch row displays an icon and a badge in the summary card", () => {
    render(<PrivacySettingsPage />)

    const summaryBadges = screen.getAllByText(/visible|hidden/i)
    expect(summaryBadges.length).toBe(5)
  })

  it("all switches have unique ids matching their labels", () => {
    render(<PrivacySettingsPage />)

    const switches = screen.getAllByRole("switch")
    switches.forEach((toggle) => {
      const id = toggle.getAttribute("id")
      expect(id).toBeTruthy()
      const label = document.querySelector(`[for="${id}"]`)
      expect(label).toBeInTheDocument()
    })
  })
})