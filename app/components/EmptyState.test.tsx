import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders eyebrow, title, description, and action label", () => {
    render(
      <EmptyState
        actionLabel="Create stream"
        eyebrow="Streams"
        title="No data available"
        description="Please connect your wallet to continue."
      />,
    );

    expect(screen.getByText(/streams/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /no data available/i })).toBeInTheDocument();
    expect(screen.getByText(/please connect your wallet to continue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create stream/i })).toBeInTheDocument();
  });
});
