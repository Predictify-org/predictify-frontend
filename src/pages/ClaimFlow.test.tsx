import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClaimFlow from "./ClaimFlow";

jest.mock("@/context/ClaimShareContext", () => ({
  useClaimShare: () => ({
    openShareSheet: jest.fn(),
  }),
}));

// Prefixing with "mock" lets Jest's module hoisting reference this from
// inside the jest.mock factory below.
const mockToastSuccess = jest.fn();
jest.mock("@/components/ui/custom-toast", () => ({
  customToast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// ClaimFlow gates its data behind a 1200ms delay unless prefers-reduced-motion
// is on (see the component's `reducedMotion` branch). The suite forces that
// branch so tests observe the loaded state deterministically instead of
// racing a real timer — this is what was causing every test here to fail
// against a still-loading skeleton screen.
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

describe("ClaimFlow", () => {
  it("renders the pending claims and history sections with accessible headings", async () => {
    render(<ClaimFlow />);

    expect(screen.getByRole("heading", { name: /claim winnings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pending claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /claim history/i })).toBeInTheDocument();
    
    // Wait for the simulated network request to finish
    expect(await screen.findByLabelText(/claimable rewards/i, {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("announces the claim action and removes the claimed reward from the list via button click", async () => {
    const user = userEvent.setup();
    render(<ClaimFlow />);

    const claimButtons = await screen.findAllByRole("button", { name: /claim/i }, { timeout: 2000 });
    await user.click(claimButtons[0]);

    expect(await screen.findByText(/successfully claimed/i, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByText(/arsenal vs liverpool/i)).not.toBeInTheDocument();
  });

  it("triggers claim on 'c' keyboard shortcut", async () => {
    const user = userEvent.setup();
    render(<ClaimFlow />);

    expect(await screen.findByText(/Arsenal vs Liverpool/i, {}, { timeout: 2000 })).toBeInTheDocument();
    
    await user.keyboard('c');
    
    expect(await screen.findByText(/Successfully claimed/i, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByText(/arsenal vs liverpool/i)).not.toBeInTheDocument();
  });
});