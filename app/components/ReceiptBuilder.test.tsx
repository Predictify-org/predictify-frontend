/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ReceiptBuilder } from "./ReceiptBuilder";
import type { Stream } from "../types/openapi";

const MOCK_STREAM: Stream = {
  id: "stream-ada",
  recipient: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
  rate: "120 XLM / month",
  schedule: "Pays every 30 days",
  status: "active",
  label: "Ada Creative Studio",
  email: "ada@example.com",
  createdAt: "2024-11-01T09:00:00.000Z",
  updatedAt: "2024-11-20T14:30:00.000Z",
  settlementTxHash:
    "c3f8a12e4b76d09e1a23f456bc78d90e1f234a5678b9c0d1e2f3a4b5c6d7e8f9",
  token: "XLM",
};

describe("ReceiptBuilder", () => {
  it("renders the receipt document with stream info", () => {
    render(<ReceiptBuilder stream={MOCK_STREAM} />);

    expect(
      screen.getByRole("article", { name: /payment stream receipt/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada Creative Studio")).toBeInTheDocument();
    expect(screen.getByText("120 XLM / month")).toBeInTheDocument();
  });

  it("renders the note textarea with placeholder", () => {
    render(<ReceiptBuilder stream={MOCK_STREAM} />);

    const textarea = screen.getByRole("textbox", { name: /custom note/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute(
      "placeholder",
      expect.stringContaining("optional"),
    );
  });

  it("updates note on user input and displays it in the receipt", () => {
    render(<ReceiptBuilder stream={MOCK_STREAM} />);

    const textarea = screen.getByRole("textbox", { name: /custom note/i });
    fireEvent.change(textarea, { target: { value: "Test note for receipt" } });

    expect(textarea).toHaveValue("Test note for receipt");
    expect(screen.getAllByText("Test note for receipt")).toHaveLength(2);
    expect(screen.getByText("Receipt Note")).toBeInTheDocument();
  });

  it("renders print and share buttons", () => {
    render(<ReceiptBuilder stream={MOCK_STREAM} />);

    expect(
      screen.getAllByRole("button", { name: /print \/ save as pdf/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^share$/i }),
    ).toBeInTheDocument();
  });

  it("does not display note section when note is empty", () => {
    render(<ReceiptBuilder stream={MOCK_STREAM} />);

    expect(screen.queryByText("Receipt Note")).not.toBeInTheDocument();
  });

  it("respects network prop", () => {
    render(<ReceiptBuilder network="mainnet" stream={MOCK_STREAM} />);

    expect(screen.getAllByText("Stellar Mainnet").length).toBeGreaterThan(0);
  });

  it("renders without optional fields", () => {
    const minimalStream: Stream = {
      id: "stream-minimal",
      recipient: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
      rate: "10 XLM / month",
      schedule: "Monthly",
      status: "draft",
      createdAt: "2024-12-01T00:00:00.000Z",
      updatedAt: "2024-12-01T00:00:00.000Z",
      token: "XLM",
    };

    render(<ReceiptBuilder stream={minimalStream} />);

    expect(
      screen.getByRole("article", { name: /payment stream receipt/i }),
    ).toBeInTheDocument();
  });
});
