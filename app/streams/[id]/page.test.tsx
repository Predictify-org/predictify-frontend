/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import StreamDetailPage from "./page";
import { notFound } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

describe("StreamDetailPage Server Component & Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves and renders the detail page for stream-ada (Active)", async () => {
    const params = Promise.resolve({ id: "stream-ada" });
    const jsx = await StreamDetailPage({ params });
    render(jsx);

    // Verify summary details are shown
    expect(screen.getByRole("heading", { name: /stream summary/i })).toBeInTheDocument();
    expect(screen.getByText("stream-ada")).toBeInTheDocument();
    expect(screen.getByText("Ada Creative Studio")).toBeInTheDocument();
    expect(screen.getByText("120 XLM / month")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();

    // Verify next action mirrors StreamRow behavior ("Pause" for active)
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    // Verify print receipt link is rendered correctly
    const receiptLink = screen.getByRole("link", { name: /print stream receipt/i });
    expect(receiptLink).toBeInTheDocument();
    expect(receiptLink).toHaveAttribute("href", "/streams/stream-ada/receipt");

    // Verify accessible vertical timeline ordered list semantics
    const timelineList = screen.getByRole("list", { name: /payment lifecycle stages/i });
    expect(timelineList).toBeInTheDocument();
    expect(timelineList.tagName).toBe("OL");

    // Verify steps have descriptive status texts for screen readers
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    
    // Created stage should be marked completed
    expect(steps[0]).toHaveTextContent("Stream Created");
    expect(steps[0]).toHaveTextContent("Completed stage");

    // Started stage should be marked completed
    expect(steps[1]).toHaveTextContent("Stream Started");
    expect(steps[1]).toHaveTextContent("Completed stage");

    // Settled stage should be marked current active
    expect(steps[2]).toHaveTextContent("Funds Settled");
    expect(steps[2]).toHaveTextContent("Current active stage");
    
    // Withdrawn stage should be marked upcoming/pending
    expect(steps[3]).toHaveTextContent("Funds Withdrawn");
    expect(steps[3]).toHaveTextContent("Upcoming stage");
  });

  it("resolves and renders the detail page for stream-kemi (Draft)", async () => {
    const params = Promise.resolve({ id: "stream-kemi" });
    const jsx = await StreamDetailPage({ params });
    render(jsx);

    expect(screen.getByText("stream-kemi")).toBeInTheDocument();
    expect(screen.getByText("Kemi Onboarding Support")).toBeInTheDocument();
    expect(screen.getByText("32 XLM / week")).toBeInTheDocument();

    // Next action for draft stream is "Start"
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();

    const steps = screen.getAllByRole("listitem");
    // Started stage should be current active for a draft stream ready to launch
    expect(steps[1]).toHaveTextContent("Stream Started");
    expect(steps[1]).toHaveTextContent("Current active stage");
  });

  it("resolves and renders the detail page for stream-yusuf (Ended)", async () => {
    const params = Promise.resolve({ id: "stream-yusuf" });
    const jsx = await StreamDetailPage({ params });
    render(jsx);

    expect(screen.getByText("stream-yusuf")).toBeInTheDocument();
    expect(screen.getByText("Yusuf QA Partnership")).toBeInTheDocument();
    expect(screen.getByText("18 XLM / day")).toBeInTheDocument();

    // Next action for ended stream is "Withdraw"
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeInTheDocument();

    const steps = screen.getAllByRole("listitem");
    // Withdrawn stage should be current active for ended stream
    expect(steps[3]).toHaveTextContent("Funds Withdrawn");
    expect(steps[3]).toHaveTextContent("Current active stage");
  });

  it("calls notFound() if the stream id is not present in mock data", async () => {
    const params = Promise.resolve({ id: "non-existent-stream-id" });
    
    await StreamDetailPage({ params });
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
