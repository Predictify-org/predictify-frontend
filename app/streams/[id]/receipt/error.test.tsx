/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ReceiptError from "./error";

const mockError = new Error("Test render failure") as Error & { digest?: string };

describe("ReceiptError", () => {
  it("renders the receipt-specific heading", () => {
    render(<ReceiptError error={mockError} reset={jest.fn()} />);
    expect(
      screen.getByRole("heading", { name: /we couldn't load this receipt/i }),
    ).toBeInTheDocument();
  });

  it("renders the reassuring body message", () => {
    render(<ReceiptError error={mockError} reset={jest.fn()} />);
    expect(screen.getByText(/your payment data is safe/i)).toBeInTheDocument();
  });

  it("renders the Try again button and calls reset on click", () => {
    const reset = jest.fn();
    render(<ReceiptError error={mockError} reset={reset} />);

    const btn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(btn);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a Back to streams link pointing to /streams", () => {
    render(<ReceiptError error={mockError} reset={jest.fn()} />);
    const link = screen.getByRole("link", { name: /back to streams/i });
    expect(link).toHaveAttribute("href", "/streams");
  });

  it("renders the error digest as a support reference when present", () => {
    const errorWithDigest = Object.assign(new Error("Server error"), {
      digest: "abc-123-digest",
    });
    render(<ReceiptError error={errorWithDigest} reset={jest.fn()} />);
    expect(screen.getByText(/abc-123-digest/i)).toBeInTheDocument();
  });

  it("omits the support reference section when digest is absent", () => {
    render(<ReceiptError error={mockError} reset={jest.fn()} />);
    expect(screen.queryByText(/support reference/i)).not.toBeInTheDocument();
  });
});
