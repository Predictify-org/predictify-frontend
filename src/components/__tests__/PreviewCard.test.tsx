import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PreviewCard } from "@/src/components/PreviewCard";

// Mock the Radix UI HoverCard since it uses browser APIs not available in jsdom.
// The mock renders the trigger and content unconditionally so we can assert
// on the preview card content.
jest.mock("@/components/ui/hover-card", () => {
  const MockHoverCard = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-card-root">{children}</div>
  );
  const MockHoverCardTrigger = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-card-trigger">{children}</div>
  );
  const MockHoverCardContent = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="hover-card-content" className={className}>
      {children}
    </div>
  );
  return {
    HoverCard: MockHoverCard,
    HoverCardTrigger: MockHoverCardTrigger,
    HoverCardContent: MockHoverCardContent,
  };
});

describe("PreviewCard", () => {
  it("renders the trigger element", () => {
    render(
      <PreviewCard label="Yes" variant="yes">
        <button data-testid="trigger-btn">Yes</button>
      </PreviewCard>
    );
    expect(screen.getByTestId("hover-card-root")).toBeInTheDocument();
    expect(screen.getByTestId("trigger-btn")).toBeInTheDocument();
  });

  it("renders the preview card content with label and variant", () => {
    render(
      <PreviewCard label="Yes" variant="yes" badge="62%">
        <button>Yes</button>
      </PreviewCard>
    );
    // The variant name appears in the card content
    expect(screen.getByTestId("hover-card-content")).toHaveTextContent("yes");
    // The badge value appears in the card content
    expect(screen.getByTestId("hover-card-content")).toHaveTextContent("62%");
  });

  it("shows the selected indicator when selected is true", () => {
    render(
      <PreviewCard label="No" variant="no" selected>
        <button>No</button>
      </PreviewCard>
    );
    expect(screen.getByText("Currently selected")).toBeInTheDocument();
  });

  it("does not show the selected indicator when selected is false", () => {
    render(
      <PreviewCard label="No" variant="no" selected={false}>
        <button>No</button>
      </PreviewCard>
    );
    expect(screen.queryByText("Currently selected")).not.toBeInTheDocument();
  });

  it("renders the keyboard accessibility hint", () => {
    render(
      <PreviewCard label="Yes" variant="yes">
        <button>Yes</button>
      </PreviewCard>
    );
    expect(
      screen.getByText(/use tab to focus/i)
    ).toBeInTheDocument();
  });

  it("renders different variant colors", () => {
    const { rerender } = render(
      <PreviewCard label="Yes" variant="yes">
        <button>Yes</button>
      </PreviewCard>
    );
    // Each variant should render without error
    rerender(
      <PreviewCard label="No" variant="no">
        <button>No</button>
      </PreviewCard>
    );
    expect(screen.getByText("no")).toBeInTheDocument();

    rerender(
      <PreviewCard label="Maybe" variant="neutral">
        <button>Maybe</button>
      </PreviewCard>
    );
    expect(screen.getByText("neutral")).toBeInTheDocument();
  });

  it("renders without badge when badge is not provided", () => {
    render(
      <PreviewCard label="Yes" variant="yes">
        <button>Yes</button>
      </PreviewCard>
    );
    expect(screen.queryByText("Odds")).not.toBeInTheDocument();
  });
});