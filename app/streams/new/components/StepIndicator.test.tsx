import React from "react";
import { render, screen } from "@testing-library/react";
import { StepIndicator } from "./StepIndicator";
import "@testing-library/jest-dom";

const defaultSteps = [
  { id: "details", label: "Details", description: "Configure stream details" },
  { id: "recipients", label: "Recipients", description: "Add recipients and splits" },
  { id: "review", label: "Review", description: "Review and confirm" },
];

describe("StepIndicator", () => {
  it("renders all steps", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Recipients")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("renders step numbers for upcoming and current steps", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders checkmarks for completed steps", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={2} />);

    const markers = document.querySelectorAll(".step-indicator__check");
    expect(markers).toHaveLength(2);
  });

  it("shows description only for the current step", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    expect(screen.getByText("Configure stream details")).toBeInTheDocument();
    expect(screen.queryByText("Add recipients and splits")).not.toBeInTheDocument();
    expect(screen.queryByText("Review and confirm")).not.toBeInTheDocument();
  });

  it("renders description elements for all steps in DOM", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const descs = document.querySelectorAll(".step-indicator__desc");
    expect(descs).toHaveLength(3);
  });

  it("sets aria-current='step' on the current step", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={1} />);

    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[2]).not.toHaveAttribute("aria-current");
  });

  it("applies the correct CSS class for each step state", () => {
    const { container } = render(<StepIndicator steps={defaultSteps} currentStep={1} />);

    const steps = container.querySelectorAll(".step-indicator__step");
    expect(steps[0]).toHaveClass("step-indicator__step--completed");
    expect(steps[1]).toHaveClass("step-indicator__step--current");
    expect(steps[2]).toHaveClass("step-indicator__step--upcoming");
  });

  it("renders the nav landmark with aria-label", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const nav = screen.getByRole("navigation", { name: "Progress" });
    expect(nav).toBeInTheDocument();
  });

  it("renders an ordered list", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
  });

  it("handles a single step", () => {
    const singleStep = [{ id: "done", label: "Done" }];
    render(<StepIndicator steps={singleStep} currentStep={0} />);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("handles empty steps array gracefully", () => {
    render(<StepIndicator steps={[]} currentStep={0} />);

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(list.children).toHaveLength(0);
  });

  it("applies additional className", () => {
    const { container } = render(
      <StepIndicator steps={defaultSteps} currentStep={0} className="my-custom-class" />
    );

    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("step-indicator");
    expect(nav).toHaveClass("my-custom-class");
  });

  it("renders connector dividers between steps", () => {
    const { container } = render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const connectors = container.querySelectorAll(".step-indicator__connector");
    expect(connectors).toHaveLength(2);
  });

  it("does not render connector for single step", () => {
    const { container } = render(
      <StepIndicator steps={[{ id: "done", label: "Done" }]} currentStep={0} />
    );

    const connectors = container.querySelectorAll(".step-indicator__connector");
    expect(connectors).toHaveLength(0);
  });

  it("all markers have aria-hidden", () => {
    const { container } = render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const markers = container.querySelectorAll(".step-indicator__marker");
    markers.forEach((marker) => {
      expect(marker).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("connectors have aria-hidden", () => {
    const { container } = render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const connectors = container.querySelectorAll(".step-indicator__connector");
    connectors.forEach((conn) => {
      expect(conn).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("handles currentStep at the last step", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={2} />);

    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[1]).not.toHaveAttribute("aria-current");
    expect(steps[2]).toHaveAttribute("aria-current", "step");
  });

  it("handles currentStep at the first step", () => {
    render(<StepIndicator steps={defaultSteps} currentStep={0} />);

    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(steps[1]).not.toHaveAttribute("aria-current");
    expect(steps[2]).not.toHaveAttribute("aria-current");
  });
});
