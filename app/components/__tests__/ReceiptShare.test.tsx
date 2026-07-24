import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ReceiptShare } from "../ReceiptShare"

const defaultProps = {
  receiptId: "RCP-2026-001",
  marketTitle: "Will the GrantFox campaign hit 10k signups?",
  outcome: "Yes",
  amount: "12.50 XLM",
  timestamp: "2026-07-23T17:30:00.000Z",
  campaign: "GrantFox FWC26",
}

describe("ReceiptShare", () => {
  it("opens the share preview and renders the receipt details", async () => {
    render(<ReceiptShare {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /share receipt/i }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(defaultProps.marketTitle)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.outcome)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.amount)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.receiptId)).toBeInTheDocument()
  })

  it("copies the share link when the copy action is selected", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    render(<ReceiptShare {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /share receipt/i }))

    fireEvent.click(await screen.findByRole("button", { name: /copy link/i }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("predictify.app/receipts/"))
    })
  })
})
