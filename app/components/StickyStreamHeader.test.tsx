/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { StickyStreamHeader } from "./StickyStreamHeader";

describe("StickyStreamHeader", () => {
  it("renders the stream summary with a sticky position", () => {
    render(
      <StickyStreamHeader
        streamId="s-1"
        status="active"
        amount="42.00"
        recipient="GABCDEF1234567890XYZ"
      />,
    );

    const header = screen.getByLabelText("Stream s-1 summary");
    expect(header).toHaveStyle({ position: "sticky", top: "0px" });
    expect(header).toHaveTextContent("42.00 XLM");
    expect(screen.getByLabelText("Stream status: active")).toBeInTheDocument();
  });

  it("shortens long recipient addresses but keeps the full value as a title", () => {
    render(
      <StickyStreamHeader
        streamId="s-2"
        status="paused"
        amount="1.00"
        recipient="GABCDEF1234567890XYZ"
      />,
    );

    expect(screen.getByText("to GABC…0XYZ")).toBeInTheDocument();
    expect(screen.getByTitle("GABCDEF1234567890XYZ")).toBeInTheDocument();
  });
});
