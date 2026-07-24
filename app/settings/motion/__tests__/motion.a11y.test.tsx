import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import MotionSettingsPage from "../page"

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

describe("Settings → Motion page", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("motion-reduced")
    mockMatchMedia(false)
  })

  it("renders the page heading and description", () => {
    render(<MotionSettingsPage />)

    expect(
      screen.getByRole("heading", { name: /motion/i })
    ).toBeInTheDocument()

    expect(
      screen.getByText(/control animations and transitions/i)
    ).toBeInTheDocument()
  })

  it("renders the reduced motion toggle switch", () => {
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).toBeInTheDocument()
  })

  it("toggle is unchecked by default when no preference is stored and system prefers no reduced motion", () => {
    mockMatchMedia(false)
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).not.toBeChecked()
  })

  it("toggle is checked by default when system prefers reduced motion", () => {
    mockMatchMedia(true)
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).toBeChecked()
  })

  it("toggle reflects stored preference from localStorage", () => {
    localStorage.setItem("predictify-motion", "true")
    mockMatchMedia(false)

    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).toBeChecked()
  })

  it("toggle reflects stored preference as unchecked", () => {
    localStorage.setItem("predictify-motion", "false")
    mockMatchMedia(true)

    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).not.toBeChecked()
  })

  it("clicking the toggle updates aria-checked", () => {
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
  })

  it("clicking toggle again restores unchecked state", () => {
    localStorage.setItem("predictify-motion", "true")
    mockMatchMedia(false)

    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
  })

  it("applies motion-reduced class to <html> when toggle is on", () => {
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    fireEvent.click(toggle)

    expect(document.documentElement.classList.contains("motion-reduced")).toBe(true)
  })

  it("removes motion-reduced class from <html> when toggle is off", () => {
    localStorage.setItem("predictify-motion", "true")
    mockMatchMedia(false)

    render(<MotionSettingsPage />)

    expect(document.documentElement.classList.contains("motion-reduced")).toBe(true)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    fireEvent.click(toggle)

    expect(document.documentElement.classList.contains("motion-reduced")).toBe(false)
  })

  it("description paragraph is linked to the toggle via aria-describedby", () => {
    render(<MotionSettingsPage />)

    const toggle = screen.getByRole("switch", { name: /reduce motion globally/i })
    const describedBy = toggle.getAttribute("aria-describedby")

    expect(describedBy).toBe("motion-reduced-description")
    expect(document.getElementById(describedBy!)).toBeInTheDocument()
  })
})
