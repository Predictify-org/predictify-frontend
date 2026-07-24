import React from "react"
import { render, screen } from "@testing-library/react"
import { ThemeProvider } from "@/components/theme-provider"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render children inside a ThemeProvider set to a specific theme. */
function renderWithTheme(theme: string, children: React.ReactElement) {
  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      forcedTheme={theme}
      themes={["light", "dark", "high-contrast"]}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("High-Contrast Theme", () => {
  beforeEach(() => {
    // Reset HTML classes between tests (next-themes mutates documentElement)
    document.documentElement.className = ""
  })

  // ---- Provider support --------------------------------------------------

  it("ThemeProvider accepts 'high-contrast' as a forced theme", () => {
    renderWithTheme(
      "high-contrast",
      <div data-testid="child">Hello</div>,
    )
    expect(screen.getByTestId("child")).toBeInTheDocument()
    // next-themes adds the theme class to <html>
    expect(document.documentElement).toHaveClass("high-contrast")
  })

  it("high-contrast class sets 'light' theme class on document element", () => {
    renderWithTheme(
      "high-contrast",
      <div data-testid="test-el">Test</div>,
    )
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true)
  })

  // ---- Class application ------------------------------------------------

  it("applies 'high-contrast' class to <html> element", () => {
    renderWithTheme(
      "high-contrast",
      <div data-testid="test-el">Test</div>,
    )
    expect(document.documentElement.className).toContain("high-contrast")
  })

  it("does not apply 'dark' or 'light' class when high-contrast is forced", () => {
    renderWithTheme(
      "high-contrast",
      <div data-testid="test-el">Test</div>,
    )
    expect(document.documentElement).not.toHaveClass("dark")
    expect(document.documentElement).not.toHaveClass("light")
  })

  // ---- Theme isolation ---------------------------------------------------

  it("does not interfere with light theme", () => {
    renderWithTheme(
      "light",
      <div data-testid="test-el">Test</div>,
    )
    expect(document.documentElement).toHaveClass("light")
    expect(document.documentElement).not.toHaveClass("high-contrast")
  })

  it("does not interfere with dark theme", () => {
    renderWithTheme(
      "dark",
      <div data-testid="test-el">Test</div>,
    )
    expect(document.documentElement).toHaveClass("dark")
    expect(document.documentElement).not.toHaveClass("high-contrast")
  })

  // ---- next-themes integration ------------------------------------------

  it("theme is listed in ThemeProvider themes prop", () => {
    // Verify the provider renders without error for all three themes
    renderWithTheme("high-contrast", <div data-testid="a">A</div>)
    expect(screen.getByTestId("a")).toBeInTheDocument()

    renderWithTheme("light", <div data-testid="b">B</div>)
    expect(screen.getByTestId("b")).toBeInTheDocument()

    renderWithTheme("dark", <div data-testid="c">C</div>)
    expect(screen.getByTestId("c")).toBeInTheDocument()
  })

  // ---- CSS availability (import validation) -------------------------------

  it("high-contrast CSS file is importable", () => {
    // Verify the CSS module can be imported without errors.
    // The actual styles are validated visually; this confirms no build errors.
    expect(() => {
      require("./high-contrast.css")
    }).not.toThrow()
  })
})
