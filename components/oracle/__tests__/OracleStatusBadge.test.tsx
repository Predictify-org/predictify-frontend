import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OracleStatusBadge } from "@/components/oracle/OracleStatusBadge";
import { OracleStatusClientError } from "@/lib/oracle-status-client";
import type { OracleAttemptResult } from "@/types/oracle-status";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function attempts(
  overrides: Partial<OracleAttemptResult>[] = [{}],
): OracleAttemptResult[] {
  return overrides.map((o, i) => ({
    provider: "chainlink",
    attempt: i,
    success: i === overrides.length - 1,
    outcome: "yes",
    timestamp: NOW,
    ...o,
  }));
}

describe("OracleStatusBadge", () => {
  it("shows a loading state without losing prior data", async () => {
    const fetcher = jest.fn().mockReturnValue(new Promise<OracleAttemptResult[]>(() => {}));
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(await screen.findByText(/Checking oracle freshness/i)).toBeInTheDocument();
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders a fresh primary success", async () => {
    const fetcher = jest.fn().mockResolvedValue(attempts([{ success: true }]));
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(await screen.findByText("Chainlink")).toBeInTheDocument();
    expect(screen.getByText("Fresh")).toBeInTheDocument();
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "false");
  });

  it("renders a stale confirmation", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(attempts([{ success: true, timestamp: NOW - 5 * DAY }]));
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(await screen.findByText("Stale")).toBeInTheDocument();
    expect(screen.getByText(/updated 5d ago/i)).toBeInTheDocument();
  });

  it("renders fallback details when the primary oracle fails", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      attempts([
        { provider: "chainlink", success: false },
        { provider: "pyth", success: true },
      ]),
    );
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(await screen.findByText("Pyth")).toBeInTheDocument();
    expect(
      screen.getByText(/Primary oracle \(Chainlink\) failed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Resolved via Pyth after 2 attempts/i),
    ).toBeInTheDocument();
  });

  it("renders a permission-restricted state without a retry", async () => {
    const permission = new OracleStatusClientError(
      "forbidden",
      "permission",
      false,
    );
    const fetcher = jest.fn().mockRejectedValue(permission);
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(
      await screen.findByText(/Oracle freshness and fallback details are restricted/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("renders a retryable error with a working retry", async () => {
    const user = userEvent.setup();
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(attempts([{ success: true }]));

    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(await screen.findByText(/Could not load oracle status/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry loading oracle status/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    expect(await screen.findByText("Chainlink")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("renders a not-found state without a retry button", async () => {
    const notFound = new OracleStatusClientError(
      "missing",
      "not_found",
      false,
    );
    const fetcher = jest.fn().mockRejectedValue(notFound);
    render(<OracleStatusBadge marketId="m" fetcher={fetcher} now={() => NOW} />);

    expect(
      await screen.findByText(/Oracle status is not available for this market/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("does not fetch when no marketId is provided", () => {
    const fetcher = jest.fn();
    render(<OracleStatusBadge fetcher={fetcher} now={() => NOW} />);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
