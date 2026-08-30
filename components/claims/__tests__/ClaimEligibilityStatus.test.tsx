import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ClaimEligibilityStatus } from "@/components/claims/ClaimEligibilityStatus";
import { ClaimEligibilityClientError } from "@/lib/claim-eligibility-client";
import type { ClaimEvidence } from "@/types/claim-eligibility";

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

function evidence(overrides: Partial<ClaimEvidence> = {}): ClaimEvidence {
  return {
    marketId: "m1",
    outcome: "Lakers to win",
    userPrediction: "Lakers to win",
    resolvedAt: NOW - 2 * HOUR,
    source: "oracle",
    claimed: false,
    claimStatus: "available",
    winnings: 18,
    winningsToken: "XLM",
    ...overrides,
  };
}

describe("ClaimEligibilityStatus", () => {
  it("shows a loading announcement then an eligible result", async () => {
    const fetcher = jest.fn().mockResolvedValue(evidence());
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    expect(screen.getByTestId("claim-eligibility-m1")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Eligible to claim")).toBeInTheDocument(),
    );
    // Winning amount from the reason text is surfaced.
    expect(screen.getByText(/You are eligible to claim 18 XLM/)).toBeInTheDocument();
  });

  it("shows a stale-evidence warning for old evidence", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(evidence({ resolvedAt: NOW - 5 * 24 * HOUR }));
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Eligible to claim")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Evidence may be outdated/)).toBeInTheDocument();
  });

  it("shows the ineligible outcome state", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(evidence({ userPrediction: "Heat to win" }));
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Not eligible")).toBeInTheDocument(),
    );
  });

  it("shows the already-claimed state", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(evidence({ claimed: true, claimStatus: "available" }));
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Already claimed")).toBeInTheDocument(),
    );
  });

  it("shows the disputed state", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(evidence({ claimStatus: "disputed" }));
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Under dispute")).toBeInTheDocument(),
    );
  });

  it("surfaces the permission (authorization) state and offers no retry", async () => {
    const fetcher = jest.fn().mockRejectedValue(
      new ClaimEligibilityClientError("Connect wallet", "permission", false),
    );
    render(<ClaimEligibilityStatus marketId="m1" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Authorization required")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("surfaces a neutral unavailable state for not_found", async () => {
    const fetcher = jest.fn().mockRejectedValue(
      new ClaimEligibilityClientError("nope", "not_found", false),
    );
    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(screen.getByText("Eligibility unavailable")).toBeInTheDocument(),
    );
  });

  it("renders a retryable error with a working Retry button", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(evidence());

    render(<ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(screen.getByText("Eligible to claim")).toBeInTheDocument(),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("preserves last-good data while reloading (no data loss)", async () => {
    const first = evidence({ winnings: 18 });
    const second = evidence({ winnings: 42 });
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const { rerender } = render(
      <ClaimEligibilityStatus marketId="m1" account="GABC" fetcher={fetcher} />,
    );

    await waitFor(() =>
      expect(screen.getByText(/18 XLM/)).toBeInTheDocument(),
    );

    // Changing the account triggers a reload; the previous (18 XLM) result must
    // stay visible while the new request is in flight.
    rerender(
      <ClaimEligibilityStatus marketId="m1" account="GXYZ" fetcher={fetcher} />,
    );

    expect(screen.getByText(/18 XLM/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/42 XLM/)).toBeInTheDocument(),
    );
  });
});
