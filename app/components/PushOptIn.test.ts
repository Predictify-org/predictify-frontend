/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { PushOptIn } from "./PushOptIn";

describe("PushOptIn", () => {
  const originalNotification = global.Notification;
  const originalPushManager = (window as typeof window & { PushManager?: unknown }).PushManager;
  const originalSecureContext = window.isSecureContext;
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    global.Notification = originalNotification;
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: originalPushManager,
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalSecureContext,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    jest.restoreAllMocks();
  });

  it("falls back to email when push is unsupported", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    const onEmailFallbackChange = jest.fn();
    render(
      React.createElement(PushOptIn, {
        emailFallbackEnabled: true,
        onEmailFallbackChange,
      })
    );

    expect(await screen.findByText(/web push is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enable push notifications/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email me critical alerts/i)).toBeChecked();
  });

  it("enables email fallback when the browser denies push permission", async () => {
    const requestPermission = jest.fn().mockResolvedValue("denied");
    global.Notification = {
      permission: "default",
      requestPermission,
    } as Notification;

    const onEmailFallbackChange = jest.fn();
    render(
      React.createElement(PushOptIn, {
        emailFallbackEnabled: false,
        onEmailFallbackChange,
      })
    );

    fireEvent.click(await screen.findByRole("button", { name: /enable push notifications/i }));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(onEmailFallbackChange).toHaveBeenCalledWith(true);
    });

    expect(screen.getByText(/email fallback has been enabled/i)).toBeInTheDocument();
  });
});
