/**
 * @jest-environment jsdom
 */

import { render, waitFor, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { SwitchNetwork } from "./SwitchNetwork";

describe("SwitchNetwork", () => {
  it("renders nothing when the networks match (case-insensitive)", () => {
    const { container } = render(
      <SwitchNetwork
        currentNetwork="Testnet"
        requiredNetwork="testnet"
        onSwitch={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("warns and offers a one-click switch on mismatch", async () => {
    const onSwitch = jest.fn().mockResolvedValue(undefined);

    render(
      <SwitchNetwork
        currentNetwork="testnet"
        requiredNetwork="mainnet"
        onSwitch={onSwitch}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "this app requires",
    );

    fireEvent.click(screen.getByLabelText("Switch wallet to mainnet"));

    await waitFor(() =>
      expect(onSwitch).toHaveBeenCalledWith("mainnet"),
    );
  });
});
