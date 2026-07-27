/**
 * Tests for app/profile/[addr]/page.tsx — Issue #647
 *
 * Verifies the Followers/Following counts in the profile header use
 * `tabular-nums` so digits align vertically as values change, matching
 * the project-wide numeric-display convention (see src/styles/typography.css).
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import ProfilePage from "../page"

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: () => ({ address: "0xabc123def456", name: "Test User" }),
}))

jest.mock("@/components/profile/ProfileShareCard", () => ({
  ProfileShareCard: () => <div data-testid="profile-share-card" />,
}))

describe("ProfilePage — Issue #647: tabular-nums on header counts", () => {
  it("applies tabular-nums to the Followers count", () => {
    render(<ProfilePage />)
    const followers = screen.getByText("128")
    expect(followers.className).toMatch(/tabular-nums/)
  })

  it("applies tabular-nums to the Following count", () => {
    render(<ProfilePage />)
    const following = screen.getByText("64")
    expect(following.className).toMatch(/tabular-nums/)
  })

  it("marks both header counts with data-numeric for the CSS attribute opt-in", () => {
    render(<ProfilePage />)
    expect(screen.getByText("128")).toHaveAttribute("data-numeric", "true")
    expect(screen.getByText("64")).toHaveAttribute("data-numeric", "true")
  })
})
