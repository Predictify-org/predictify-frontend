import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MarketsPage from "../page";

// next/link needs a router in tests
jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

describe("MarketsPage — empty state", () => {
  it("renders markets when no filters are active", () => {
    render(<MarketsPage />);
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(screen.getByRole("searchbox", { name: /search markets/i }), "zzznomatch");

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/no markets match your search/i)).toBeInTheDocument();
  });

  it("clears filters and restores results on 'Clear all filters' click", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(screen.getByRole("searchbox", { name: /search markets/i }), "zzznomatch");
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear all filters/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/will argentina win/i)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search markets/i })).toHaveValue("");
  });

  it("empty state has role=status and aria-live=polite for accessibility", async () => {
    const user = userEvent.setup();
    render(<MarketsPage />);

    await user.type(screen.getByRole("searchbox", { name: /search markets/i }), "zzznomatch");

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
