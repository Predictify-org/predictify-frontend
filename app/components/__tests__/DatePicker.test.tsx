import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DatePicker } from "../DatePicker"

describe("DatePicker – single mode", () => {
  it("renders a labelled text field and a calendar trigger button", () => {
    render(<DatePicker label="Start date" />)
    expect(screen.getByLabelText("Start date")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /choose date for start date/i })).toBeInTheDocument()
  })

  it("shows the format hint associated with the field via aria-describedby", () => {
    render(<DatePicker label="Start date" dateFormat="yyyy-MM-dd" />)
    const input = screen.getByLabelText("Start date")
    const hintId = input.getAttribute("aria-describedby")
    expect(hintId).toBeTruthy()
    expect(screen.getByText("Format: yyyy-mm-dd")).toBeInTheDocument()
  })

  it("displays a pre-selected value formatted per dateFormat", () => {
    render(<DatePicker label="Start date" value={new Date(2026, 0, 15)} dateFormat="yyyy-MM-dd" />)
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-01-15")
  })

  it("commits a validly typed date on blur and calls onChange", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<DatePicker label="Start date" onChange={onChange} />)

    const input = screen.getByLabelText("Start date")
    await user.type(input, "2026-03-04")
    await user.tab()

    expect(onChange).toHaveBeenCalledTimes(1)
    const called = onChange.mock.calls[0][0] as Date
    expect(called.getFullYear()).toBe(2026)
    expect(called.getMonth()).toBe(2)
    expect(called.getDate()).toBe(4)
    expect(input).not.toHaveAttribute("aria-invalid", "true")
  })

  it("surfaces an accessible error for an invalid typed date and does not call onChange", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<DatePicker label="Start date" onChange={onChange} />)

    const input = screen.getByLabelText("Start date")
    await user.type(input, "not-a-date")
    await user.tab()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/enter a date/i)
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(onChange).not.toHaveBeenCalled()
  })

  it("rejects a typed date outside of minDate/maxDate", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <DatePicker
        label="Start date"
        onChange={onChange}
        minDate={new Date(2026, 0, 1)}
        maxDate={new Date(2026, 0, 31)}
      />
    )

    const input = screen.getByLabelText("Start date")
    await user.type(input, "2026-02-14")
    await user.tab()

    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available/i)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("opens the calendar dialog via the trigger button and exposes dialog semantics", async () => {
    const user = userEvent.setup()
    render(<DatePicker label="Start date" />)

    const trigger = screen.getByRole("button", { name: /choose date for start date/i })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")

    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /start date calendar/i })).toBeInTheDocument()
    })
  })

  it("selecting a day in the calendar updates the field and calls onChange", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<DatePicker label="Start date" value={new Date(2026, 0, 10)} onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: /choose date for start date/i }))
    const dialog = await screen.findByRole("dialog")

    // react-day-picker renders each visible day as a <button> whose text
    // content is the day-of-month number; find the one in the currently
    // displayed month (there's exactly one per rendered month).
    const day15 = Array.from(dialog.querySelectorAll("button")).find(
      (btn) => btn.textContent === "15"
    ) as HTMLElement
    expect(day15).toBeDefined()
    await user.click(day15)

    expect(onChange).toHaveBeenCalled()
    const called = onChange.mock.calls[0][0] as Date
    expect(called.getDate()).toBe(15)
  })

  it("announces the selected date in a live region", async () => {
    const user = userEvent.setup()
    render(<DatePicker label="Start date" />)

    const input = screen.getByLabelText("Start date")
    await user.type(input, "2026-05-01")
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/date selected: 2026-05-01/i)).toBeInTheDocument()
    })
  })

  it("respects the disabled prop on both the field and the trigger", () => {
    render(<DatePicker label="Start date" disabled />)
    expect(screen.getByLabelText("Start date")).toBeDisabled()
    expect(screen.getByRole("button", { name: /choose date for start date/i })).toBeDisabled()
  })
})

describe("DatePicker – range mode", () => {
  it("renders separate labelled From and To fields inside a fieldset", () => {
    render(<DatePicker mode="range" label="Date range" />)
    expect(screen.getByRole("group", { name: "Date range" })).toBeInTheDocument()
    expect(screen.getByLabelText("From")).toBeInTheDocument()
    expect(screen.getByLabelText("To")).toBeInTheDocument()
  })

  it("calls onChange with a partial range when only the From date is typed", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<DatePicker mode="range" onChange={onChange} />)

    await user.type(screen.getByLabelText("From"), "2026-01-01")
    await user.tab()

    expect(onChange).toHaveBeenCalled()
    const range = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(range.from.getDate()).toBe(1)
    expect(range.to).toBeUndefined()
  })

  it("builds a full range once both From and To are provided", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const { rerender } = render(<DatePicker mode="range" onChange={onChange} />)

    await user.type(screen.getByLabelText("From"), "2026-01-01")
    await user.tab()
    const fromOnly = onChange.mock.calls[onChange.mock.calls.length - 1][0]

    rerender(<DatePicker mode="range" onChange={onChange} value={fromOnly} />)

    await user.type(screen.getByLabelText("To"), "2026-01-10")
    await user.tab()

    const full = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(full.from.getDate()).toBe(1)
    expect(full.to.getDate()).toBe(10)
  })
})
