import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClaimFlow from "./ClaimFlow";

jest.mock("@/context/ClaimShareContext", () => ({
  useClaimShare: () => ({
    openShareSheet: jest.fn(),
  }),
}));

jest.mock("@/components/ui/custom-toast", () => ({
  customToast: {
    success: jest.fn(),
  },
}));

describe("ClaimFlow", () => {
  it("renders the pending claims and history sections with accessible headings", () => {
    render(<ClaimFlow />);

    expect(screen.getByRole("heading", { name: /claim winnings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pending claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /claim history/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/claimable rewards/i)).toBeInTheDocument();
  });

  it("announces the claim action and removes the claimed reward from the list", async () => {
    const user = userEvent.setup();
    render(<ClaimFlow />);

    const claimButton = await screen.findByRole("button", { name: /claim/i });
    await user.click(claimButton);

    expect(await screen.findByText(/successfully claimed/i)).toBeInTheDocument();
    expect(screen.queryByText(/arsenal vs liverpool/i)).not.toBeInTheDocument();
  });
});
