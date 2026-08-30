/**
 * Tests for ClaimFlow claim-action polish (buffer #4)
 *
 * Scope:
 *  1. Claim button shows keyboard shortcut hints
 *  2. Clicking Claim marks the claim as claimed and announces success
 *  3. Ctrl/Cmd+Enter claims the first available winnings
 *  4. Busy state disables the active claim button
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClaimFlowPage, {
  ClaimCard,
  CLAIM_LATENCY_MS,
  MOCK_CLAIMS,
  type Claim,
} from "@/app/(dashboard)/claims/page";

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/components/EmptyState", () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
  }: React.PropsWithChildren<{ value: string; onValueChange?: (v: string) => void }>) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: React.PropsWithChildren) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: React.PropsWithChildren<{ value: string }>) => (
    <button role="tab">{children}</button>
  ),
  TabsContent: ({ children }: React.PropsWithChildren<{ value: string }>) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
    ...rest
  }: React.PropsWithChildren<{ className?: string } & Record<string, unknown>>) => (
    <div className={className} {...rest}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: string;
    variant?: string;
  } & Record<string, unknown>>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: React.PropsWithChildren) => <div role="alert">{children}</div>,
  AlertTitle: ({ children }: React.PropsWithChildren) => <strong>{children}</strong>,
  AlertDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
}));

const availableClaim: Claim = MOCK_CLAIMS.find((c) => c.status === "available")!;

describe("ClaimCard", () => {
  it("renders keyboard shortcut hints on the claim button", () => {
    render(<ClaimCard claim={availableClaim} />);

    const button = screen.getByRole("button", {
      name: `Claim ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
    });
    expect(button).toBeInTheDocument();
    expect(button.querySelectorAll("kbd")).toHaveLength(2);
  });

  it("calls onClaim when the claim button is clicked", async () => {
    const onClaim = jest.fn();
    render(<ClaimCard claim={availableClaim} onClaim={onClaim} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: `Claim ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
      })
    );

    expect(onClaim).toHaveBeenCalledWith(availableClaim);
  });

  it("shows a busy claiming state", () => {
    render(<ClaimCard claim={availableClaim} isClaiming />);

    const button = screen.getByRole("button", {
      name: `Claiming ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Claiming…");
  });
});

describe("ClaimFlowPage claim action polish", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("claims winnings from the primary action and announces success", async () => {
    render(<ClaimFlowPage />);

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    const claimButton = await screen.findByRole("button", {
      name: `Claim ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
    });

    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(
      screen.getByRole("button", {
        name: `Claiming ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
      })
    ).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(CLAIM_LATENCY_MS);
    });

    await waitFor(() => {
      expect(screen.getByTestId("claim-flow-live-region")).toHaveTextContent(
        `Successfully claimed ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}.`
      );
    });

    // That market's claim button should no longer be actionable
    expect(
      screen.queryByRole("button", {
        name: `Claim ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
      })
    ).not.toBeInTheDocument();
  });

  it("claims the first available winnings via Ctrl+Enter", async () => {
    render(<ClaimFlowPage />);

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    await screen.findByRole("button", {
      name: `Claim ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}`,
    });

    await act(async () => {
      fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
    });

    await act(async () => {
      jest.advanceTimersByTime(CLAIM_LATENCY_MS);
    });

    await waitFor(() => {
      expect(screen.getByTestId("claim-flow-live-region")).toHaveTextContent(
        `Successfully claimed ${availableClaim.winnings} ${availableClaim.winningsToken} for ${availableClaim.marketTitle}.`
      );
    });
  });
});
