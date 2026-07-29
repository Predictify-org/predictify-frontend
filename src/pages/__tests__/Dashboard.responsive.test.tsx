import React from "react"
import { render, screen } from "@testing-library/react"
import Dashboard from "../Dashboard"

// Mock the StellarWaveEmptyState to keep tests focused on Dashboard layout
jest.mock("../../components/EmptyState", () => ({
  StellarWaveEmptyState: () => (
    <div data-testid="stellar-wave-empty-state">Empty State Mock</div>
  ),
}))

describe("Dashboard responsive layout (Issue #651)", () => {
  describe("container", () => {
    it("renders with responsive padding classes for mobile-first scaling", () => {
      const { container } = render(<Dashboard />)
      const wrapper = container.querySelector(".dashboard-container")
      expect(wrapper).toBeInTheDocument()
      expect(wrapper?.className).toMatch(/p-4/)
      expect(wrapper?.className).toMatch(/sm:p-6/)
      expect(wrapper?.className).toMatch(/lg:p-8/)
    })

    it("uses role='region' with aria-label for accessibility", () => {
      const { container } = render(<Dashboard />)
      const wrapper = container.querySelector(".dashboard-container")
      expect(wrapper).toHaveAttribute("role", "region")
      expect(wrapper).toHaveAttribute("aria-label", "Dashboard")
    })

    it("keeps tabIndex={0} for keyboard focusability", () => {
      const { container } = render(<Dashboard />)
      const wrapper = container.querySelector(".dashboard-container")
      expect(wrapper).toHaveAttribute("tabindex", "0")
    })

    it("uses the dashboard-container class for focus-visible CSS targeting", () => {
      const { container } = render(<Dashboard />)
      const wrapper = container.querySelector(".dashboard-container")
      expect(wrapper?.className).toMatch(/dashboard-container/)
    })
  })

  describe("heading", () => {
    it("renders heading with responsive font size (text-2xl on mobile, sm:text-sxl)", () => {
      render(<Dashboard />)
      const heading = screen.getByRole("heading", { name: "Dashboard" })
      expect(heading).toBeInTheDocument()
      expect(heading.className).toMatch(/text-2xl/)
      expect(heading.className).toMatch(/sm:text-3xl/)
    })

    it("applies responsive bottom margin (mb-4 on mobile, sm:mb-6)", () => {
      render(<Dashboard />)
      const heading = screen.getByRole("heading", { name: "Dashboard" })
      expect(heading.className).toMatch(/mb-4/)
      expect(heading.className).toMatch(/sm:mb-6/)
    })

    it("renders with font-bold for visual hierarchy", () => {
      render(<Dashboard />)
      const heading = screen.getByRole("heading", { name: "Dashboard" })
      expect(heading.className).toMatch(/font-bold/)
    })

    it("is an h1 element for correct document outline", () => {
      render(<Dashboard />)
      const heading = screen.getByRole("heading", { name: "Dashboard" })
      expect(heading.tagName).toBe("H1")
    })
  })

  describe("content", () => {
    it("renders the StellarWaveEmptyState component", () => {
      render(<Dashboard />)
      expect(
        screen.getByTestId("stellar-wave-empty-state"),
      ).toBeInTheDocument()
    })
  })
})
