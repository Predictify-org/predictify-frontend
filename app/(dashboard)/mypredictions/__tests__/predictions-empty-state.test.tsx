import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PredictionsList, type Prediction } from "../page";

const activePrediction: Prediction = {
  id: "active-1",
  title: "Arsenal vs Liverpool",
  description: "Arsenal to win",
  stakeAmount: 10,
  stakeToken: "USDC",
  odds: 1.8,
  potentialWinnings: 18,
  winningsToken: "USDC",
  eventDate: "10/06/2026",
  status: "active",
};

describe("PredictionsList empty filtered state", () => {
  it("shows a reset CTA when the selected status has no matches", async () => {
    const user = userEvent.setup();

    render(<PredictionsList predictions={[activePrediction]} />);

    await user.click(screen.getByRole("button", { name: "Pending" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "No predictions match your filters"
    );

    await user.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(
      screen.getByRole("heading", { name: activePrediction.title })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("resets search filters from the empty state", async () => {
    const user = userEvent.setup();

    render(<PredictionsList predictions={[activePrediction]} />);

    await user.type(screen.getByLabelText(/search predictions/i), "no match");

    expect(screen.getByRole("status")).toHaveTextContent(
      'No predictions match "no match".'
    );

    await user.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(screen.getByLabelText(/search predictions/i)).toHaveValue("");
    expect(
      screen.getByRole("heading", { name: activePrediction.title })
    ).toBeInTheDocument();
  });
});

