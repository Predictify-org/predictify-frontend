/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { PageError } from "./PageError";

describe("PageError", () => {
  it("renders heading and message", () => {
    render(
      <PageError
        heading="Couldn't load data"
        message="Check your connection and try again."
      />,
    );

    expect(
      screen.getByRole("heading", { name: /couldn't load data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check your connection and try again/i),
    ).toBeInTheDocument();
  });

  it("renders the Error eyebrow label", () => {
    render(<PageError heading="Oops" message="Something failed." />);
    expect(screen.getByText(/^error$/i)).toBeInTheDocument();
  });

  it("renders retry button and calls onRetry when clicked", () => {
    const onRetry = jest.fn();
    render(
      <PageError
        heading="Load failed"
        message="Please retry."
        onRetry={onRetry}
      />,
    );

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides retry button when onRetry is not provided", () => {
    render(<PageError heading="Load failed" message="Contact support." />);
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a custom retry label", () => {
    render(
      <PageError
        heading="Oops"
        message="Reload the page."
        onRetry={jest.fn()}
        retryLabel="Reload"
      />,
    );
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });

  it("always renders the contact support link", () => {
    render(<PageError heading="Error" message="An error occurred." />);
    expect(
      screen.getByRole("link", { name: /contact support/i }),
    ).toBeInTheDocument();
  });

  it("uses a custom support href when provided", () => {
    render(
      <PageError
        heading="Error"
        message="An error occurred."
        supportHref="/help"
      />,
    );
    const link = screen.getByRole("link", { name: /contact support/i });
    expect(link).toHaveAttribute("href", "/help");
  });

  it("has role=alert for immediate screen-reader announcement", () => {
    render(<PageError heading="Error" message="Failed." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has data-testid for test targeting", () => {
    render(<PageError heading="Error" message="Failed." />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
  });
});
