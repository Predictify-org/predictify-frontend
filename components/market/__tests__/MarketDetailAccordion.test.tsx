import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketDetailAccordion } from "../MarketDetailAccordion";

const sections = [
  { id: "overview", label: "Overview", content: <p>Overview content</p> },
  { id: "rules", label: "Rules", content: <p>Rules content</p> },
  { id: "resolution", label: "Resolution", content: <p>Resolution content</p> },
];

describe("MarketDetailAccordion", () => {
  it("renders all section trigger labels", () => {
    render(<MarketDetailAccordion sections={sections} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(screen.getByText("Resolution")).toBeInTheDocument();
  });

  it("expands a section when its trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<MarketDetailAccordion sections={sections} />);

    // Content is hidden initially in single mode (no defaultOpen)
    const trigger = screen.getByRole("button", { name: /overview/i });
    await user.click(trigger);

    expect(screen.getByText("Overview content")).toBeVisible();
  });

  it("opens defaultOpen section on mount", () => {
    render(
      <MarketDetailAccordion sections={sections} defaultOpen="rules" />
    );
    // The Rules content should be visible without any interaction
    expect(screen.getByText("Rules content")).toBeInTheDocument();
  });

  it("returns null when sections array is empty", () => {
    const { container } = render(<MarketDetailAccordion sections={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("trigger buttons have correct ARIA expanded attribute", async () => {
    const user = userEvent.setup();
    render(<MarketDetailAccordion sections={sections} />);

    const trigger = screen.getByRole("button", { name: /resolution/i });
    // Collapsed by default
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("supports type=multiple – keeps multiple sections open", async () => {
    const user = userEvent.setup();
    render(
      <MarketDetailAccordion sections={sections} type="multiple" />
    );

    await user.click(screen.getByRole("button", { name: /overview/i }));
    await user.click(screen.getByRole("button", { name: /rules/i }));

    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByText("Rules content")).toBeInTheDocument();
  });
});
