/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ReceiptLoading from "./loading";

describe("ReceiptLoading", () => {
  it("renders with aria-label for screen readers", () => {
    render(<ReceiptLoading />);
    expect(screen.getByLabelText(/loading receipt/i)).toBeInTheDocument();
  });

  it("sets aria-busy=true on the container", () => {
    render(<ReceiptLoading />);
    const container = screen.getByLabelText(/loading receipt/i);
    expect(container).toHaveAttribute("aria-busy", "true");
  });

  it("renders toolbar skeleton buttons", () => {
    const { container } = render(<ReceiptLoading />);
    const buttons = container.querySelectorAll(".skeleton--button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("renders skeleton fields for the receipt document", () => {
    const { container } = render(<ReceiptLoading />);
    const skeletons = container.querySelectorAll(".skeleton");
    // Should have a healthy number of skeleton elements to match the receipt structure
    expect(skeletons.length).toBeGreaterThan(8);
  });

  it("marks the document skeleton as aria-hidden to avoid noisy announcements", () => {
    render(<ReceiptLoading />);
    // The article skeleton is presentational; real content is announced via aria-label
    const article = screen.getByRole("article", { hidden: true });
    expect(article).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a divider between skeleton sections", () => {
    const { container } = render(<ReceiptLoading />);
    const dividers = container.querySelectorAll(".receipt-divider");
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });
});
