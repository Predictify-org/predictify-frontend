/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import React from "react";
import OnboardingPage from "./page";

describe("OnboardingPage", () => {
  it("renders the three-step explainer and calls to action", () => {
    render(React.createElement(OnboardingPage));

    expect(screen.getByRole("heading", { name: /how streaming works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /fund the stream/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /payments flow automatically/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /settle and withdraw with confidence/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review notifications/i })).toHaveAttribute("href", "/settings/notifications");
  });
});
