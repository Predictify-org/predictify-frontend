/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { SettingItem } from "./SettingItem";

function renderItem(overrides: Partial<React.ComponentProps<typeof SettingItem>> = {}) {
  const onInAppChange = jest.fn();
  const onEmailChange = jest.fn();
  render(
    <SettingItem
      id="stream-started"
      label="Stream Started"
      description="When a new payment stream is initiated."
      inApp={false}
      email={true}
      onInAppChange={onInAppChange}
      onEmailChange={onEmailChange}
      {...overrides}
    />,
  );
  return { onInAppChange, onEmailChange };
}

describe("SettingItem", () => {
  it("renders the category label and description", () => {
    renderItem();
    expect(screen.getByText("Stream Started")).toBeInTheDocument();
    expect(
      screen.getByText("When a new payment stream is initiated."),
    ).toBeInTheDocument();
  });

  it("exposes an accessible switch per channel reflecting its state", () => {
    renderItem();
    const inApp = screen.getByLabelText("In-app notifications for Stream Started");
    const email = screen.getByLabelText("Email notifications for Stream Started");

    expect(inApp).toHaveAttribute("role", "switch");
    expect(inApp).toHaveAttribute("aria-checked", "false");
    expect(email).toHaveAttribute("aria-checked", "true");
  });

  it("toggles the in-app channel independently of email", () => {
    const { onInAppChange, onEmailChange } = renderItem();

    fireEvent.click(
      screen.getByLabelText("In-app notifications for Stream Started"),
    );

    expect(onInAppChange).toHaveBeenCalledWith(true);
    expect(onEmailChange).not.toHaveBeenCalled();
  });

  it("toggles the email channel independently of in-app", () => {
    const { onInAppChange, onEmailChange } = renderItem();

    fireEvent.click(
      screen.getByLabelText("Email notifications for Stream Started"),
    );

    expect(onEmailChange).toHaveBeenCalledWith(false);
    expect(onInAppChange).not.toHaveBeenCalled();
  });
});
