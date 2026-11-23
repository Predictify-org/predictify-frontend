import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SetAlertPopover } from "../SetAlertPopover"
import { useAlertsStore } from "@/app/state/alerts"

describe("SetAlertPopover", () => {
  beforeEach(() => {
    localStorage.clear()
    useAlertsStore.setState({ alerts: [] })
  })

  it("adds a valid threshold alert and reports invalid values inline", async () => {
    const user = userEvent.setup()
    render(<SetAlertPopover marketId="market-1" marketTitle="Test market" />)
    await user.click(screen.getByRole("button", { name: /set alert/i }))

    const threshold = screen.getByLabelText("Probability (%)")
    fireEvent.change(threshold, { target: { value: "100" } })
    await user.click(screen.getByRole("button", { name: "Add alert" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a probability from 1% to 99%."
    )
    expect(useAlertsStore.getState().alerts).toHaveLength(0)

    fireEvent.change(threshold, { target: { value: "60" } })
    await user.click(screen.getByRole("button", { name: "Add alert" }))
    expect(screen.getByText("Above 60%")).toBeInTheDocument()
  })

  it("allows keyboard access to the popover and removal of an alert", async () => {
    const user = userEvent.setup()
    useAlertsStore.getState().addAlert({
      marketId: "market-1",
      kind: "odds_below",
      threshold: 40,
    })
    render(<SetAlertPopover marketId="market-1" />)

    const trigger = screen.getByRole("button", { name: /set alert/i })
    trigger.focus()
    await user.keyboard("{Enter}")
    expect(screen.getByText("Below 40%")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Remove alert" }))
    expect(screen.getByText("No alerts set.")).toBeInTheDocument()
  })
})
