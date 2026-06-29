/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import StreamReceiptPage from "./page";
import { notFound } from "next/navigation";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

describe("StreamReceiptPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the receipt builder for a known stream", async () => {
    const params = Promise.resolve({ id: "stream-ada" });
    const jsx = await StreamReceiptPage({ params });
    render(jsx);

    expect(
      screen.getByRole("article", { name: /payment stream receipt/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("stream-ada")).toBeInTheDocument();
    expect(screen.getByText("Ada Creative Studio")).toBeInTheDocument();
  });

  it("renders the note textarea", async () => {
    const params = Promise.resolve({ id: "stream-ada" });
    const jsx = await StreamReceiptPage({ params });
    render(jsx);

    expect(
      screen.getByRole("textbox", { name: /custom note/i }),
    ).toBeInTheDocument();
  });

  it("renders print and share buttons", async () => {
    const params = Promise.resolve({ id: "stream-kemi" });
    const jsx = await StreamReceiptPage({ params });
    render(jsx);

    expect(
      screen.getByRole("button", { name: /print \/ save as pdf/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^share$/i }),
    ).toBeInTheDocument();
  });

  it("calls notFound for unknown stream id", async () => {
    const params = Promise.resolve({ id: "non-existent" });
    await StreamReceiptPage({ params });
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
