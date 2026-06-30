/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { RateField } from "./RateField";

function renderField(unit: "second" | "hour" | "day" = "hour") {
  const onValueChange = jest.fn();
  const onUnitChange = jest.fn();
  render(
    <RateField
      value="10"
      unit={unit}
      onValueChange={onValueChange}
      onUnitChange={onUnitChange}
    />,
  );
  return { onValueChange, onUnitChange };
}

describe("RateField", () => {
  it("renders the amount and unit selector", () => {
    renderField();
    expect(screen.getByLabelText("Stream rate")).toHaveValue(10);
    expect(screen.getByLabelText("Rate unit")).toHaveValue("hour");
  });

  it("keeps inline help collapsed until toggled", () => {
    renderField("second");
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("note")).toHaveTextContent("tokens/s");
  });

  it("explains the unit currently selected", () => {
    renderField("day");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("note")).toHaveTextContent("tokens/d");
  });

  it("propagates value and unit changes", () => {
    const { onValueChange, onUnitChange } = renderField();

    fireEvent.change(screen.getByLabelText("Stream rate"), {
      target: { value: "25" },
    });
    expect(onValueChange).toHaveBeenCalledWith("25");

    fireEvent.change(screen.getByLabelText("Rate unit"), {
      target: { value: "day" },
    });
    expect(onUnitChange).toHaveBeenCalledWith("day");
  });
});
