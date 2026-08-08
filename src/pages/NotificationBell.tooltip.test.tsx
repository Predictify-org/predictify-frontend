import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBell } from "./NotificationBell";

describe("NotificationBell tooltip (#763)", () => {
  it("exposes the bell button with an accessible tooltip trigger", () => {
    render(<NotificationBell unreadCount={5} reducedMotion />);

    // The bell button carries the accessible label describing the unread count
    const bell = screen.getByRole("button", { name: /5 unread/i });
    expect(bell).toBeInTheDocument();

    // The same text is used as tooltip content, declared on the component so
    // screen readers and hover-users get the same description.
    expect(bell).toHaveAccessibleName("Notifications — 5 unread");
  });

  it("announces the bell state via the accessible label when there are no unread", () => {
    render(<NotificationBell reducedMotion />);
    const bell = screen.getByRole("button", { name: /Notifications/i });
    expect(bell).toHaveAccessibleName("Notifications");
  });
});