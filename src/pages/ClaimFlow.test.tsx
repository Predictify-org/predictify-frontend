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
  it("renders the pending claims and history sections with accessible headings", () => {
    render(<ClaimFlow />);

    expect(screen.getByRole("heading", { name: /claim winnings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pending claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /claim history/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/claimable rewards/i)).toBeInTheDocument();
  });

  it("confirms the claim via toast and removes the claimed reward from the list", async () => {
    const user = userEvent.setup();
    render(<ClaimFlow />);

    const [claimButton] = screen.getAllByRole("button", { name: /^claim$/i });
    await user.click(claimButton);

    await waitFor(() =>
      expect(screen.queryByText(/arsenal vs liverpool/i)).not.toBeInTheDocument()
    );

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Winnings Claimed Successfully!",
      expect.objectContaining({
        description: expect.stringContaining("Arsenal vs Liverpool"),
      })
    );
  });

  // --- focus-visible coverage (issue #585) ------------------------------
  //
  // app/__tests__/focus-visible.test.js already asserts the global
  // focus.css layer exists and is imported. What was missing is coverage
  // that ClaimFlow's actual interactive controls (Claim / Share buttons)
  // are keyboard-focusable and carry a visible focus-visible affordance —
  // the shadcn/ui `Button` component supplies this via Tailwind's
  // `focus-visible:ring-*` utilities rather than the global outline layer,
  // so it's worth locking in independently of focus.css itself.

  it("Claim buttons are keyboard-focusable and expose a focus-visible ring", () => {
    render(<ClaimFlow />);

    const [claimButton] = screen.getAllByRole("button", { name: /^claim$/i });

    expect(claimButton.className).toEqual(
      expect.stringContaining("focus-visible:ring")
    );

    claimButton.focus();
    expect(claimButton).toHaveFocus();
  });

  it("Share (icon-only) buttons have an accessible name and a focus-visible ring", () => {
    render(<ClaimFlow />);

    const shareButton = screen.getAllByRole("button", {
      name: /^share claim for/i,
    })[0];

    // Icon-only controls need an explicit accessible name — visual focus
    // alone isn't enough for screen-reader / switch-device users.
    expect(shareButton).toHaveAccessibleName();
    expect(shareButton.className).toEqual(
      expect.stringContaining("focus-visible:ring")
    );

    shareButton.focus();
    expect(shareButton).toHaveFocus();
  });
});
