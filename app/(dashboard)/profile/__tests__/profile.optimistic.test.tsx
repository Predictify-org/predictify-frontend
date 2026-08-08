import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfilePage from "../page";
import { useWalletContext } from "@/context/WalletContext";

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: jest.fn(),
}));

jest.mock("@/components/profile/ProfileShareCard", () => ({
  ProfileShareCard: () => <button>Share my profile</button>,
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,test"),
}));

jest.mock("html-to-image", () => ({
  toPng: jest.fn().mockResolvedValue("data:image/png;base64,test"),
}));

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

const mockUseWalletContext = useWalletContext as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockUseWalletContext.mockReturnValue({
    address: "0xabc123def456",
    name: "Test User",
    connected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    isLoading: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe("ProfilePage Optimistic UI", () => {
  it("shows a loading state on the submit button while saving", async () => {
    render(<ProfilePage />);
    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    // Immediately shows loading state
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it("shows a success message after a successful save", async () => {
    render(<ProfilePage />);
    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(
      screen.getByText("Profile updated successfully!")
    ).toBeInTheDocument();
  });

  it("resets to idle after the success message times out", async () => {
    render(<ProfilePage />);
    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(
      screen.getByText("Profile updated successfully!")
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(
      screen.queryByText("Profile updated successfully!")
    ).not.toBeInTheDocument();
  });
});