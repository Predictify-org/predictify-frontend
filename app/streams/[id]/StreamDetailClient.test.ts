/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import type { Stream } from "../../types/openapi";

jest.mock("../../../lib/apiClient", () => ({
  fetchWithIdempotency: jest.fn().mockResolvedValue({ ok: true }),
}));

const RequestCtor = globalThis.Request ?? class Request {};
const ResponseCtor = globalThis.Response ?? class Response {};
const HeadersCtor = globalThis.Headers ?? class Headers {};
(global as typeof globalThis & { Request: typeof RequestCtor }).Request = RequestCtor;
(global as typeof globalThis & { Response: typeof ResponseCtor }).Response = ResponseCtor;
(global as typeof globalThis & { Headers: typeof HeadersCtor }).Headers = HeadersCtor;

const { StreamDetailClient } = require("./StreamDetailClient") as typeof import("./StreamDetailClient");

const activeStream: Stream = {
  id: "stream-ada",
  recipient: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
  rate: "120 XLM / month",
  schedule: "Pays every 30 days",
  status: "active",
  label: "Ada Creative Studio",
  email: "ada@example.com",
  createdAt: "2026-06-01T09:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
  token: "XLM",
};

describe("StreamDetailClient", () => {
  it("links to the contract events panel for the current stream", () => {
    render(React.createElement(StreamDetailClient, { stream: activeStream }));

    const eventsLink = screen.getByRole("link", { name: /view contract events/i });

    expect(eventsLink).toBeInTheDocument();
    expect(eventsLink).toHaveAttribute("href", "/streams/stream-ada/events");
  });

  it("renders the destructive cancel action and modal flow for active streams", () => {
    render(React.createElement(StreamDetailClient, { stream: activeStream }));

    fireEvent.click(screen.getByRole("button", { name: /cancel stream/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("dialog", { name: /cancel stream/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/type 120 xlm to confirm/i)).toBeInTheDocument();
  });
});
