import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckCircle } from "lucide-react";
import ClaimFlow from "./ClaimFlow";
import { EmptyState } from "@/components/EmptyState";
import { useReducedMotion } from "@/hooks/useReducedMotion";

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: jest.fn(),
}));

jest.mock("@/context/ClaimShareContext", () => ({
  useClaimShare: () => ({ openShareSheet: jest.fn() }),
}));

jest.mock("@/components/ui/custom-toast", () => ({
  customToast: {
    success: jest.fn(),
  },
}));

describe("ClaimFlow empty state", () => {
  beforeEach(() => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
  });

  it("renders the themed empty state with a CTA once every reward is claimed", async () => {
    const user = userEvent.setup();
    render(<ClaimFlow />);

    for (const button of await screen.findAllByRole("button", { name: /^claim$/i })) {
      await user.click(button);
      await waitFor(() => expect(button).not.toBeInTheDocument());
    }

    expect(screen.getByText("No claimable rewards")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /explore markets/i });
    expect(cta).toHaveAttribute("href", "/events");
  });

  // MOCK_HISTORY is a hardcoded non-empty array, so ClaimFlow's own
  // "no claim history" branch is unreachable through user interaction today.
  // This exercises the exact EmptyState configuration that branch renders.
  it("renders the claim-history empty state with an icon and CTA", () => {
    render(
      <EmptyState
        icon={CheckCircle}
        title="No claim history"
        description="Your completed claims will appear here."
        ctaText="Explore Markets"
        ctaHref="/events"
      />,
    );

    expect(screen.getByText("No claim history")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /explore markets/i });
    expect(cta).toHaveAttribute("href", "/events");
  });
});
