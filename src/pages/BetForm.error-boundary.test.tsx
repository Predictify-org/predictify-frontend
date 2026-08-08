import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BetForm from "../BetForm";
import { BetFormErrorFallback } from "../components/BetFormErrorFallback";

describe("BetForm error boundary fallback (#773)", () => {
  it("renders the custom fallback when a child throws", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <BetFormErrorFallback
          error={new Error("boom")}
          incidentId="test-123"
          resetErrorBoundary={() => {}}
        />
      );
      expect(screen.getByText(/couldn't load the bet form/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByText(/Incident ID: test-123/i)).toBeInTheDocument();
      expect(screen.getByTestId("bet-form-error-msg")).toHaveTextContent("boom");
    } finally {
      spy.mockRestore();
    }
  });

  it("calls resetErrorBoundary when Retry is clicked", () => {
    const reset = jest.fn();
    render(
      <BetFormErrorFallback
        error={new Error("boom")}
        incidentId={null}
        resetErrorBoundary={reset}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders without incidentId when none is provided", () => {
    render(
      <BetFormErrorFallback
        error={new Error("test error")}
        incidentId={null}
        resetErrorBoundary={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/Incident ID:/i)).not.toBeInTheDocument();
  });
});