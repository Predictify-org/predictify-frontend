/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import StreamEventsPage from "./page";
import { notFound } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

describe("StreamEventsPage (contract events panel)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the contract events panel for stream-ada", async () => {
    const params = Promise.resolve({ id: "stream-ada" });
    const jsx = await StreamEventsPage({ params });
    render(jsx);

    expect(screen.getByRole("heading", { name: /contract events/i })).toBeInTheDocument();
    expect(screen.getByText("Ada Creative Studio")).toBeInTheDocument();

    // Mocked events for stream-ada render as timeline items.
    expect(screen.getByText("Stream created and escrow funded")).toBeInTheDocument();
    expect(screen.getByText("Recipient withdrew vested funds")).toBeInTheDocument();

    // Filter toolbar is present and announces the full count.
    expect(
      screen.getByRole("group", { name: /filter contract events by type/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 5 of 5 events");
  });

  it("links back to the parent stream detail page", async () => {
    const params = Promise.resolve({ id: "stream-yusuf" });
    const jsx = await StreamEventsPage({ params });
    render(jsx);

    const backLink = screen.getByRole("link", { name: /back to stream/i });
    expect(backLink).toHaveAttribute("href", "/streams/stream-yusuf");
  });

  it("calls notFound() for an unknown stream id", async () => {
    const params = Promise.resolve({ id: "does-not-exist" });

    await StreamEventsPage({ params });

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
