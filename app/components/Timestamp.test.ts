/**
 * @jest-environment jsdom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Timestamp } from "./Timestamp";

describe("Timestamp", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows relative time by default and reveals exact values on hover", () => {
    render(React.createElement(Timestamp, { iso: "2026-06-27T10:00:00.000Z" }));

    expect(screen.getByText("2 hours ago")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("button", { name: /show exact timestamp/i }));

    expect(screen.getByRole("tooltip")).toHaveTextContent("Relative: 2 hours ago");
    expect(screen.getByRole("tooltip")).toHaveTextContent("ISO: 2026-06-27T10:00:00.000Z");
  });

  it("supports long-press on touch devices", () => {
    render(React.createElement(Timestamp, { iso: "2026-06-27T10:00:00.000Z" }));

    const trigger = screen.getByRole("button", { name: /show exact timestamp/i });
    act(() => {
      fireEvent.pointerDown(trigger);
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});
