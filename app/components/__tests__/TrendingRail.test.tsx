import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TrendingRail } from "../TrendingRail";

describe("TrendingRail", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows an error for a malformed response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: jest.fn().mockResolvedValue('[{"id":"1","title":3}]'),
    }) as typeof fetch;

    render(<TrendingRail />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load trending data");
  });

  it("renders valid trending data", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: jest.fn().mockResolvedValue(JSON.stringify([
        { id: "1", title: "BTC", value: 5, change: 2, trend: "up" },
      ])),
    }) as typeof fetch;

    render(<TrendingRail />);
    expect(await screen.findByText("BTC")).toBeInTheDocument();
  });

  it("does not update state after unmount", async () => {
    let resolveFetch!: (value: Response) => void;
    global.fetch = jest.fn().mockImplementation((_url, init) =>
      new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve;
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
    ) as typeof fetch;

    const view = render(<TrendingRail />);
    view.unmount();
    resolveFetch({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: jest.fn().mockResolvedValue("[]"),
    } as unknown as Response);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
