/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { ReceiptShareCard, maskAddress } from "./ReceiptShareCard";

const RECIPIENT = "GABCDEF1234567890XYZ";

describe("maskAddress", () => {
  it("keeps the first and last four characters", () => {
    expect(maskAddress(RECIPIENT)).toBe("GABC…0XYZ");
  });

  it("fully masks short strings", () => {
    expect(maskAddress("abc")).toBe("•••");
  });
});

describe("ReceiptShareCard", () => {
  it("masks the recipient by default and reveals it when toggled off", () => {
    render(
      <ReceiptShareCard streamId="s-1" recipient={RECIPIENT} amount="42.00" />,
    );

    const recipient = screen.getByTestId("receipt-recipient");
    expect(recipient).toHaveTextContent("GABC…0XYZ");
    expect(screen.getByText("42.00 XLM")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Mask recipient address"));
    expect(recipient).toHaveTextContent(RECIPIENT);
  });
});
