import { render } from "@testing-library/react";
const { screen, fireEvent } = require("@testing-library/react") as any;
import "@testing-library/jest-dom";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children correctly", () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies padding variant styles correctly", () => {
    const { container: smContainer } = render(<Card padding="sm">SM</Card>);
    expect(smContainer.firstChild).toHaveStyle({ padding: "0.75rem" });

    const { container: lgContainer } = render(<Card padding="lg">LG</Card>);
    expect(lgContainer.firstChild).toHaveStyle({ padding: "1.5rem" });
  });

  it("becomes clickable and calls onClick when provided", () => {
    const handleClick = jest.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    
    const card = screen.getByText("Clickable Card");
    expect(card).toHaveClass("card--clickable");
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has default padding when none provided", () => {
    const { container } = render(<Card>Default</Card>);
    expect(container.firstChild).toHaveStyle({ padding: "1rem" });
  });

  it("is not clickable when onClick is not provided", () => {
    render(<Card>Static Card</Card>);
    const card = screen.getByText("Static Card");
    expect(card).not.toHaveClass("card--clickable");
  });
});
