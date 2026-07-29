import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BetForm from "./BetForm";

describe("BetForm reduced-motion fallback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the bet form", () => {
    render(<BetForm />);
    expect(screen.getByRole("heading", { name: /place your bet/i })).toBeInTheDocument();
  });

  it("pairs the submitting spinner's animate-spin with a motion-reduce fallback", () => {
    render(<BetForm />);

    fireEvent.change(screen.getByLabelText(/bet amount/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /place bet/i }));

    const spinner = screen.getByText(/placing bet/i).parentElement?.querySelector("svg");
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("motion-reduce:animate-none");
  });

  it("renders the themed empty state when the campaign is not active", () => {
    render(<BetForm campaignActive={false} />);
    expect(
      screen.queryByRole("heading", { name: /place your bet/i }),
    ).not.toBeInTheDocument();
  });
});
