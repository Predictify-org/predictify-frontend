/**
 * SearchInput — focused test suite
 *
 * Covers:
 *  • ARIA combobox wiring (role, aria-expanded, aria-haspopup, aria-controls,
 *    aria-activedescendant, aria-autocomplete)
 *  • Keyboard navigation: ArrowDown, ArrowUp, Home, End, Enter, Escape, Tab
 *  • Option selection via click and Enter
 *  • Free-text submit when no option is highlighted
 *  • Clear button (keyboard + mouse)
 *  • isLoading prop
 *  • Controlled vs uncontrolled value
 *  • maxSuggestions cap
 *  • disabled state
 *  • Screen-reader live region messages
 *  • Outside-click closes the dropdown
 */

import React, { useState } from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchInput, SearchSuggestion } from "../SearchInput"

// ─── Fixture data ──────────────────────────────────────────────────────────

const suggestions: SearchSuggestion[] = [
  { id: "1", label: "Bitcoin price 2025", sublabel: "Crypto" },
  { id: "2", label: "FIFA World Cup winner", sublabel: "Football" },
  { id: "3", label: "US Election outcome", sublabel: "Politics" },
  { id: "4", label: "Tesla stock Q4", sublabel: "Stocks" },
  { id: "5", label: "Ethereum merge success", sublabel: "Crypto" },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Render with standard suggestions. */
function renderInput(props: Partial<React.ComponentProps<typeof SearchInput>> = {}) {
  const onSelect = props.onSelect ?? jest.fn()
  const onSubmit = props.onSubmit ?? jest.fn()
  const result = render(
    <SearchInput
      suggestions={suggestions}
      onSelect={onSelect}
      onSubmit={onSubmit}
      placeholder="Search markets"
      {...props}
    />
  )
  const input = screen.getByRole("combobox")
  return { ...result, input, onSelect, onSubmit }
}

// ─── ARIA wiring ───────────────────────────────────────────────────────────

describe("ARIA combobox wiring", () => {
  it("has role=combobox on the input", () => {
    renderInput()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("has aria-haspopup=listbox", () => {
    renderInput()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-haspopup", "listbox")
  })

  it("has aria-autocomplete=list", () => {
    renderInput()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-autocomplete", "list")
  })

  it("aria-expanded is false when closed", () => {
    renderInput()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false")
  })

  it("aria-expanded is true after ArrowDown opens the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true")
    )
  })

  it("aria-controls points to the listbox id", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    const combobox = screen.getByRole("combobox")
    const listboxId = combobox.getAttribute("aria-controls")!
    expect(listboxId).toBeTruthy()
    await waitFor(() =>
      expect(document.getElementById(listboxId)).toHaveAttribute("role", "listbox")
    )
  })

  it("uses the placeholder as aria-label when no aria-label prop is given", () => {
    renderInput({ placeholder: "Find a market" })
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Find a market")
  })

  it("accepts a custom aria-label that overrides the placeholder", () => {
    renderInput({ "aria-label": "Market search", placeholder: "Find a market" })
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Market search")
  })

  it("options have role=option and aria-selected", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      options
        .filter((o) => !o.getAttribute("aria-disabled"))
        .forEach((opt) => expect(opt).toHaveAttribute("aria-selected"))
    })
  })

  it("listbox has an accessible label", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toHaveAttribute(
        "aria-label",
        "Search suggestions"
      )
    )
  })
})

// ─── Keyboard — ArrowDown / ArrowUp ────────────────────────────────────────

describe("keyboard: ArrowDown / ArrowUp navigation", () => {
  it("ArrowDown highlights the first option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}")
    const activeId = screen.getByRole("combobox").getAttribute("aria-activedescendant")
    expect(activeId).toBeTruthy()
    expect(document.getElementById(activeId!)).toBeInTheDocument()
  })

  it("ArrowDown advances through options", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    expect(options[1]).toHaveAttribute("aria-selected", "true")
  })

  it("ArrowDown wraps from last to first option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    const count = options.length
    // Press ArrowDown count times to reach end, then one more to wrap
    for (let i = 0; i <= count; i++) {
      await userEvent.keyboard("{ArrowDown}")
    }
    expect(options[0]).toHaveAttribute("aria-selected", "true")
  })

  it("ArrowUp wraps from first to last option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    // ArrowDown to first, then ArrowUp to wrap to last
    await userEvent.keyboard("{ArrowDown}{ArrowUp}")
    expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true")
  })

  it("ArrowUp moves to previous option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}")
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    expect(options[0]).toHaveAttribute("aria-selected", "true")
  })
})

// ─── Keyboard — Home / End ─────────────────────────────────────────────────

describe("keyboard: Home / End navigation", () => {
  it("Home moves to the first option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Home}")
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    expect(options[0]).toHaveAttribute("aria-selected", "true")
  })

  it("End moves to the last option", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{End}")
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true")
  })
})

// ─── Keyboard — Enter ──────────────────────────────────────────────────────

describe("keyboard: Enter to select / submit", () => {
  it("Enter on a highlighted option calls onSelect with that suggestion", async () => {
    const onSelect = jest.fn()
    const { input } = renderInput({ onSelect })
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}{Enter}")
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), label: expect.any(String) })
    )
  })

  it("Enter without a highlighted option calls onSubmit with the query", async () => {
    const onSubmit = jest.fn()
    const { input } = renderInput({ onSubmit, suggestions: [] })
    await userEvent.type(input, "some query")
    await userEvent.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledWith("some query")
  })

  it("Enter on highlighted option closes the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })
})

// ─── Keyboard — Escape ────────────────────────────────────────────────────

describe("keyboard: Escape", () => {
  it("Escape closes the listbox when open", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })

  it("Escape clears the value when the listbox is already closed", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    // Close first
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument())
    // Now clear
    await userEvent.keyboard("{Escape}")
    expect(input).toHaveValue("")
  })

  it("Escape does not steal focus from the input", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await userEvent.keyboard("{Escape}")
    expect(document.activeElement).toBe(input)
  })
})

// ─── Keyboard — Tab ───────────────────────────────────────────────────────

describe("keyboard: Tab closes the listbox", () => {
  it("Tab closes the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.tab()
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })
})

// ─── Mouse / pointer interaction ─────────────────────────────────────────

describe("mouse interaction", () => {
  it("clicking an option calls onSelect", async () => {
    const onSelect = jest.fn()
    const { input } = renderInput({ onSelect })
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    await userEvent.click(options[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("clicking an option closes the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    await userEvent.click(options[0])
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })

  it("hovering an option updates aria-activedescendant", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    const options = screen.getAllByRole("option").filter((o) => !o.getAttribute("aria-disabled"))
    fireEvent.pointerEnter(options[1])
    expect(options[1]).toHaveAttribute("aria-selected", "true")
  })

  it("clicking outside the component closes the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    fireEvent.pointerDown(document.body)
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })
})

// ─── Clear button ─────────────────────────────────────────────────────────

describe("clear button", () => {
  it("shows a clear button when the input has a value", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "hello")
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument()
  })

  it("does not show a clear button when the input is empty", () => {
    renderInput()
    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument()
  })

  it("clicking clear resets the value", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "hello")
    await userEvent.click(screen.getByRole("button", { name: /clear search/i }))
    expect(input).toHaveValue("")
  })

  it("clicking clear closes the listbox", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.click(screen.getByRole("button", { name: /clear search/i }))
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    )
  })

  it("clicking clear returns focus to the input", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "hello")
    await userEvent.click(screen.getByRole("button", { name: /clear search/i }))
    expect(document.activeElement).toBe(input)
  })
})

// ─── isLoading ────────────────────────────────────────────────────────────

describe("isLoading prop", () => {
  it("shows a spinner when isLoading is true and the listbox is open", async () => {
    const { input } = renderInput({ isLoading: true })
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByRole("listbox"))
    // Spinner li carries aria-disabled=true and contains "Searching"
    const loadingOption = screen.getByRole("option", { name: /searching/i })
    expect(loadingOption).toBeInTheDocument()
  })

  it("sets aria-busy on the input when loading", () => {
    renderInput({ isLoading: true })
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "true")
  })
})

// ─── No results ───────────────────────────────────────────────────────────

describe("no results state", () => {
  it("shows 'No results found' when suggestions are empty and query is non-empty", async () => {
    const { input } = renderInput({ suggestions: [] })
    await userEvent.type(input, "xyz123")
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /no results found/i })).toBeInTheDocument()
    })
  })
})

// ─── Controlled value ─────────────────────────────────────────────────────

describe("controlled value", () => {
  it("displays the externally controlled value", () => {
    render(
      <SearchInput
        value="external"
        onChange={jest.fn()}
        suggestions={suggestions}
        placeholder="Search"
      />
    )
    expect(screen.getByRole("combobox")).toHaveValue("external")
  })

  it("calls onChange when the user types", async () => {
    const onChange = jest.fn()
    render(
      <SearchInput value="" onChange={onChange} suggestions={[]} placeholder="Search" />
    )
    await userEvent.type(screen.getByRole("combobox"), "a")
    expect(onChange).toHaveBeenCalledWith("a")
  })
})

// ─── Uncontrolled value ───────────────────────────────────────────────────

describe("uncontrolled value", () => {
  it("updates its own value when uncontrolled", async () => {
    render(<SearchInput suggestions={suggestions} placeholder="Search" />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "hello")
    expect(input).toHaveValue("hello")
  })
})

// ─── maxSuggestions ───────────────────────────────────────────────────────

describe("maxSuggestions cap", () => {
  it("shows at most maxSuggestions options", async () => {
    const { input } = renderInput({ maxSuggestions: 2 })
    await userEvent.type(input, "a")
    await waitFor(() => screen.getByRole("listbox"))
    const interactiveOptions = screen
      .getAllByRole("option")
      .filter((o) => !o.getAttribute("aria-disabled"))
    expect(interactiveOptions.length).toBeLessThanOrEqual(2)
  })
})

// ─── Disabled state ───────────────────────────────────────────────────────

describe("disabled state", () => {
  it("disables the input when disabled=true", () => {
    renderInput({ disabled: true })
    expect(screen.getByRole("combobox")).toBeDisabled()
  })

  it("does not open the listbox when disabled", async () => {
    const { input } = renderInput({ disabled: true })
    await userEvent.click(input)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})

// ─── Live region ─────────────────────────────────────────────────────────

describe("screen-reader live region", () => {
  it("announces result count when suggestions are shown", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => {
      const liveRegion = screen
        .getAllByRole("status")
        .find((el) => el.getAttribute("aria-live") === "polite")
      expect(liveRegion).toBeTruthy()
      expect(liveRegion!.textContent).toMatch(/suggestion/)
    })
  })

  it("announces 'No results found' when there are no matches", async () => {
    const { input } = renderInput({ suggestions: [] })
    await userEvent.type(input, "xyz123")
    await waitFor(() => {
      const liveRegion = screen
        .getAllByRole("status")
        .find((el) => el.getAttribute("aria-live") === "polite")
      expect(liveRegion!.textContent).toMatch(/no results/i)
    })
  })
})

// ─── Sublabel ─────────────────────────────────────────────────────────────

describe("sublabel", () => {
  it("renders the sublabel beneath the main label", async () => {
    const { input } = renderInput()
    await userEvent.type(input, "bit")
    await waitFor(() => screen.getByText("Crypto"))
  })
})

// ─── Snapshot / regression ────────────────────────────────────────────────

describe("snapshot", () => {
  it("matches closed-state snapshot", () => {
    const { container } = renderInput()
    expect(container.firstChild).toMatchSnapshot()
  })
})
