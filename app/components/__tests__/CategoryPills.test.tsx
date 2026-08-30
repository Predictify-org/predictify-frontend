import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryPills } from "../CategoryPills"

const categories = [
  { value: "Football", label: "Football" },
  { value: "Politics", label: "Politics" },
  { value: "Crypto", label: "Crypto" },
  { value: "Stocks", label: "Stocks" },
]

describe("CategoryPills", () => {
  it("renders all category pills", () => {
    render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
    categories.forEach((c) => {
      expect(screen.getByRole("checkbox", { name: new RegExp(`^${c.label}`) })).toBeInTheDocument()
    })
  })

  it("marks selected pills as checked", () => {
    render(<CategoryPills categories={categories} selected={["Crypto"]} onToggle={jest.fn()} />)
    const cryptoPill = screen.getByRole("checkbox", { name: /crypto/i })
    expect(cryptoPill).toHaveAttribute("aria-checked", "true")
  })

  it("marks unselected pills as unchecked", () => {
    render(<CategoryPills categories={categories} selected={["Crypto"]} onToggle={jest.fn()} />)
    const footballPill = screen.getByRole("checkbox", { name: /football/i })
    expect(footballPill).toHaveAttribute("aria-checked", "false")
  })

  it("calls onToggle with the value when clicked", () => {
    const onToggle = jest.fn()
    render(<CategoryPills categories={categories} selected={[]} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole("checkbox", { name: /politics/i }))
    expect(onToggle).toHaveBeenCalledWith("Politics")
  })

  it("shows active label in aria-label when selected", () => {
    render(<CategoryPills categories={categories} selected={["Stocks"]} onToggle={jest.fn()} />)
    const stocksPill = screen.getByRole("checkbox", { name: /active filter/i })
    expect(stocksPill).toBeInTheDocument()
  })

  it("applies active class to selected pills", () => {
    render(<CategoryPills categories={categories} selected={["Football"]} onToggle={jest.fn()} />)
    const footballPill = screen.getByRole("checkbox", { name: /football/i })
    expect(footballPill).toHaveClass("bg-primary")
  })

  it("applies inactive class to unselected pills", () => {
    render(<CategoryPills categories={categories} selected={["Football"]} onToggle={jest.fn()} />)
    const politicsPill = screen.getByRole("checkbox", { name: /politics/i })
    expect(politicsPill).toHaveClass("bg-card")
  })

  it("renders with correct accessibility role and label", () => {
    render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
    const group = screen.getByRole("group", { name: /filter by category/i })
    expect(group).toBeInTheDocument()
  })

  it("accepts custom className", () => {
    const { container } = render(
      <CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} className="my-custom-class" />
    )
    const outer = container.firstChild as HTMLElement
    expect(outer).toHaveClass("my-custom-class")
  })

  describe("keyboard navigation", () => {
    it("focuses next pill on ArrowRight", () => {
      render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const first = screen.getByRole("checkbox", { name: /^football/i })
      first.focus()
      fireEvent.keyDown(first, { key: "ArrowRight" })
      expect(screen.getByRole("checkbox", { name: /^politics/i })).toHaveFocus()
    })

    it("focuses previous pill on ArrowLeft", () => {
      render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const second = screen.getByRole("checkbox", { name: /^politics/i })
      second.focus()
      fireEvent.keyDown(second, { key: "ArrowLeft" })
      expect(screen.getByRole("checkbox", { name: /^football/i })).toHaveFocus()
    })

    it("wraps around at the end on ArrowRight", () => {
      render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const last = screen.getByRole("checkbox", { name: /^stocks/i })
      last.focus()
      fireEvent.keyDown(last, { key: "ArrowRight" })
      expect(screen.getByRole("checkbox", { name: /^football/i })).toHaveFocus()
    })

    it("wraps around at the start on ArrowLeft", () => {
      render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const first = screen.getByRole("checkbox", { name: /^football/i })
      first.focus()
      fireEvent.keyDown(first, { key: "ArrowLeft" })
      expect(screen.getByRole("checkbox", { name: /^stocks/i })).toHaveFocus()
    })
  })

  describe("scroll fade indicators", () => {
    function mockOverflow(container: HTMLElement, props: { scrollLeft?: number; scrollWidth?: number; clientWidth?: number } = {}) {
      Object.defineProperty(container, "scrollWidth", { value: props.scrollWidth ?? 2000, configurable: true })
      Object.defineProperty(container, "clientWidth", { value: props.clientWidth ?? 500, configurable: true })
      Object.defineProperty(container, "scrollLeft", { value: props.scrollLeft ?? 0, writable: true, configurable: true })
    }

    it("shows right fade when content overflows and scrolled to start", () => {
      const { container } = render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const scrollEl = container.querySelector('[role="group"]')!
      mockOverflow(scrollEl, { scrollLeft: 0 })
      fireEvent.scroll(scrollEl)
      const fades = container.querySelectorAll('[aria-hidden="true"]')
      expect(fades.length).toBe(1)
    })

    it("shows left and right fades when scrolled to middle", () => {
      const { container } = render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const scrollEl = container.querySelector('[role="group"]')!
      mockOverflow(scrollEl, { scrollLeft: 100 })
      fireEvent.scroll(scrollEl)
      const fades = container.querySelectorAll('[aria-hidden="true"]')
      expect(fades.length).toBe(2)
    })

    it("shows left fade when scrolled to end", () => {
      const { container } = render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const scrollEl = container.querySelector('[role="group"]')!
      mockOverflow(scrollEl, { scrollLeft: 1500 })
      fireEvent.scroll(scrollEl)
      const fades = container.querySelectorAll('[aria-hidden="true"]')
      expect(fades.length).toBe(1)
    })

    it("hides fades when content does not overflow", () => {
      const { container } = render(<CategoryPills categories={categories} selected={[]} onToggle={jest.fn()} />)
      const scrollEl = container.querySelector('[role="group"]')!
      mockOverflow(scrollEl, { scrollLeft: 0, scrollWidth: 500, clientWidth: 500 })
      fireEvent.scroll(scrollEl)
      const fades = container.querySelectorAll('[aria-hidden="true"]')
      expect(fades.length).toBe(0)
    })
  })
})
