/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { CancelStreamModal } from "./CancelStreamModal";
import type { CancelInput } from "../lib/cancel-stream";

const ONE_TOKEN = 10_000_000n; // 1.0 in stroops

const split: CancelInput = {
  totalAmount: 100n * ONE_TOKEN,
  releasedAmount: 0n,
  vestedAmount: 40n * ONE_TOKEN,
  token: "XLM",
  senderAddress: "GSENDER",
  recipientAddress: "GRECIPIENT",
};

describe("CancelStreamModal", () => {
  it("previews the exact refund split before confirming", () => {
    render(
      <CancelStreamModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        stream={{ status: "active" }}
        split={split}
        tokenLabel="XLM"
      />,
    );

    // 40 vested ⇒ recipient keeps 40, sender refunded 60.
    expect(screen.getByTestId("recipient-payout")).toHaveTextContent("40 XLM");
    expect(screen.getByTestId("sender-refund")).toHaveTextContent("60 XLM");
  });

  it("invokes onConfirm when confirming a cancellable stream", async () => {
    const onConfirm = jest.fn();
    render(
      <CancelStreamModal
        isOpen
        onClose={jest.fn()}
        onConfirm={onConfirm}
        stream={{ status: "active" }}
        split={split}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm cancellation/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("blocks cancellation and disables confirm for terminal streams", () => {
    render(
      <CancelStreamModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        stream={{ status: "cancelled" }}
        split={split}
      />,
    );

    expect(screen.getByTestId("cancel-blocked")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm cancellation/i }),
    ).toBeDisabled();
  });
});
