/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ConfirmCancel } from "./ConfirmCancel";

describe("ConfirmCancel", () => {
  it("requires the typed amount before confirming a large cancel", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      React.createElement(ConfirmCancel, {
        action: "cancel",
        amountLabel: "120 XLM",
        isOpen: true,
        onClose: jest.fn(),
        onConfirm,
        recipientLabel: "Ada Creative Studio",
        requiresTypedAmount: true,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const finalButton = screen.getByRole("button", { name: /cancel stream/i });
    expect(finalButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type 120 xlm to confirm/i), {
      target: { value: "119 XLM" },
    });
    expect(finalButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type 120 xlm to confirm/i), {
      target: { value: "120 XLM" },
    });
    expect(finalButton).toBeEnabled();

    fireEvent.click(finalButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
