import React from "react";
import { render, screen, act } from "@testing-library/react";
import DashboardPage from "../page";
import { useWalletContext } from "@/context/WalletContext";
import { useNotificationsStore } from "@/app/state/notifications";

// Mock child components to keep the test focused on wallet-notification integration
let capturedNotifDigestProps: {
  notifications?: Array<{ id: string; userId: string; [key: string]: unknown }>;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
} = {};

jest.mock("@/app/dashboard/NotifDigest", () => ({
  NotifDigest: (props: typeof capturedNotifDigestProps) => {
    capturedNotifDigestProps = props;
    return (
      <div data-testid="notif-digest">
        <span data-testid="notif-count">{props.notifications?.length ?? 0}</span>
      </div>
    );
  },
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("next/navigation", () => ({
  useRouter() {
    return { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() };
  },
}));

jest.mock("@/app/dashboard/RefreshIndicator", () => ({
  RefreshIndicator: () => <div data-testid="refresh-indicator" />,
}));
jest.mock("@/components/dashboard/RecommendationsStrip", () => ({
  RecommendationsStrip: () => <div data-testid="recommendations-strip" />,
}));
jest.mock("@/components/dashboard/CustomizeLayoutPanel", () => ({
  CustomizeLayoutPanel: () => <div data-testid="customize-layout-panel" />,
}));
jest.mock("@/components/active-bets/ActiveBets", () => ({
  ActiveBets: () => <div data-testid="active-bets" />,
}));
jest.mock("@/components/activity-timeline", () => ({
  ActivityTimeline: () => <div data-testid="activity-timeline" />,
}));
jest.mock("@/app/components/RecentlyViewedRail", () => ({
  RecentlyViewedRail: () => <div data-testid="recently-viewed-rail" />,
}));

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: jest.fn(),
}));

const mockUseWalletContext = useWalletContext as unknown as jest.Mock;

describe("DashboardPage - Wallet notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedNotifDigestProps = {};
    useNotificationsStore.setState({
      notifications: [
        {
          id: "other-1",
          userId: "GOTHER_USER",
          category: "market",
          title: "Other user notification",
          timestamp: new Date(),
          read: false,
        },
      ],
    });
  });

  it("renders empty notification state when disconnected (address is null)", () => {
    mockUseWalletContext.mockReturnValue({
      address: null,
      name: null,
      connected: false,
      isLoading: false,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("notif-digest")).toBeInTheDocument();
    expect(capturedNotifDigestProps.notifications).toEqual([]);
  });

  it("renders empty notification state when address is undefined", () => {
    mockUseWalletContext.mockReturnValue({
      address: undefined,
      name: null,
      connected: false,
      isLoading: false,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("notif-digest")).toBeInTheDocument();
    expect(capturedNotifDigestProps.notifications).toEqual([]);
  });

  it("populates and displays notifications for connected wallet address without leaking other users data", () => {
    const userAddress = "GCONNECTED11111111111111111111111111111111111111111111111111111";
    mockUseWalletContext.mockReturnValue({
      address: userAddress,
      name: "Freighter",
      connected: true,
      isLoading: false,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("notif-digest")).toBeInTheDocument();
    const notifs = capturedNotifDigestProps.notifications || [];
    expect(notifs.length).toBeGreaterThan(0);
    // All returned notifications belong to the connected user
    expect(notifs.every((item) => item.userId === userAddress)).toBe(true);
    // Other users' notifications must not be present
    expect(notifs.some((item) => item.userId === "GOTHER_USER")).toBe(false);
  });

  it("updates notification list when connected address changes between renders", () => {
    const user1 = "GUSER1111111111111111111111111111111111111111111111111111111111";
    const user2 = "GUSER2222222222222222222222222222222222222222222222222222222222";

    mockUseWalletContext.mockReturnValue({
      address: user1,
      connected: true,
      isLoading: false,
    });

    const { rerender } = render(<DashboardPage />);

    expect(capturedNotifDigestProps.notifications?.every((n) => n.userId === user1)).toBe(true);

    // Switch to user 2
    mockUseWalletContext.mockReturnValue({
      address: user2,
      connected: true,
      isLoading: false,
    });

    rerender(<DashboardPage />);

    expect(capturedNotifDigestProps.notifications?.every((n) => n.userId === user2)).toBe(true);
  });

  it("marks all notifications as read for current user only", () => {
    const userAddress = "GUSERMARKALL11111111111111111111111111111111111111111111111111";
    mockUseWalletContext.mockReturnValue({
      address: userAddress,
      connected: true,
      isLoading: false,
    });

    render(<DashboardPage />);

    act(() => {
      capturedNotifDigestProps.onMarkAllAsRead?.();
    });

    const currentStoreNotifs = useNotificationsStore.getState().notifications;
    const userNotifs = currentStoreNotifs.filter((n) => n.userId === userAddress);
    expect(userNotifs.every((n) => n.read === true)).toBe(true);
    // Other user unread status should remain untouched
    const otherNotifs = currentStoreNotifs.filter((n) => n.userId === "GOTHER_USER");
    expect(otherNotifs[0].read).toBe(false);
  });
});
