/**
 * Tests for useNotificationPreferences React hook.
 */

jest.mock("@creit.tech/stellar-wallets-kit", () => ({
  ALBEDO_ID: "albedo",
  FREIGHTER_ID: "freighter",
  LOBSTR_ID: "lobstr",
  RABET_ID: "rabet",
  XBULL_ID: "xbull",
}));

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useNotificationPreferences } from "../useNotificationPreferences";
import { useNotificationPreferencesStore } from "@/app/state/notificationPreferences";
import { WalletProvider, useWalletContext } from "@/context/WalletContext";

describe("useNotificationPreferences Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useNotificationPreferencesStore.getState().resetAllAccounts();
    });
  });

  it("returns default preferences for anonymous account when disconnected", () => {
    const { result } = renderHook(() => useNotificationPreferences("0xAnonUser"));

    expect(result.current.activeAccount).toBe("0xanonuser");
    expect(result.current.preferences.intensity).toBe("important");
    expect(result.current.isDefault).toBe(true);
  });

  it("updates category preference and marks isDefault as false", () => {
    const { result } = renderHook(() => useNotificationPreferences("0xTestUser"));

    act(() => {
      result.current.setCategoryEnabled("settlement", false);
    });

    expect(result.current.preferences.categories.settlement).toBe(false);
    expect(result.current.isDefault).toBe(false);
  });

  it("resets preferences to defaults upon resetPreferences call", () => {
    const { result } = renderHook(() => useNotificationPreferences("0xResetUser"));

    act(() => {
      result.current.setIntensity("everything");
      result.current.setChannelEnabled("email", true);
    });

    expect(result.current.preferences.intensity).toBe("everything");
    expect(result.current.preferences.channels.email).toBe(true);
    expect(result.current.isDefault).toBe(false);

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferences.intensity).toBe("important");
    expect(result.current.preferences.channels.email).toBe(false);
    expect(result.current.isDefault).toBe(true);
  });

  it("dynamically switches preferences when active account changes", () => {
    let currentAccount = "0xUser1";
    const { result, rerender } = renderHook(
      ({ account }) => useNotificationPreferences(account),
      { initialProps: { account: currentAccount } }
    );

    // Modify User 1
    act(() => {
      result.current.setCategoryEnabled("market", false);
    });
    expect(result.current.preferences.categories.market).toBe(false);

    // Switch to User 2
    currentAccount = "0xUser2";
    rerender({ account: currentAccount });

    expect(result.current.activeAccount).toBe("0xuser2");
    expect(result.current.preferences.categories.market).toBe(true); // User 2 has defaults

    // Switch back to User 1
    currentAccount = "0xUser1";
    rerender({ account: currentAccount });

    expect(result.current.activeAccount).toBe("0xuser1");
    expect(result.current.preferences.categories.market).toBe(false); // User 1 preserved
  });
});
