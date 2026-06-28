/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { RecentRecipients } from "./RecentRecipients";
import {
  addRecentRecipient,
  clearRecentRecipients,
  getRecentRecipients,
} from "../../../state/recentRecipients";

const ADDR_A = "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G";
const ADDR_B = "GBDE4S2PHRXBLPJFQVLZJ6VFBNEXDBKGKNXQY5FAFKPV7XTMHHFP2SU";
const ADDR_C = "GC5M3NBSIFDIBZGBSMABKW7ZAQEYLQR6YIXMKBDGQCKIQE5KW7ZK7K3";
const ADDR_D = "GD2GBFGQOFKSJAL5FXIJHQFPAJDP7GQFXHTDQYKFFNPIBZRPZJKFHTB";
const ADDR_E = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQE3DCSSGNL4GQXHOPKC";
const ADDR_F = "GBXGQJWVLKZX6HIWB3R4R5JXQFQBSKNYZTZM6FXQZN6ER6SDKZFM6O";
const ADDR_G = "GDVXG2FMFFSUMMMBIUEMWPZAIU2FNCH7PNKEG3QAE6FAJQZF4KBPWF4";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  clearRecentRecipients();
});

describe("recentRecipients state module", () => {
  it("returns empty array when localStorage is empty", () => {
    expect(getRecentRecipients()).toEqual([]);
  });

  it("adds a recipient and retrieves it", () => {
    addRecentRecipient(ADDR_A);
    const result = getRecentRecipients();
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(ADDR_A);
    expect(result[0].addedAt).toBeLessThanOrEqual(Date.now());
  });

  it("prepends new entries so the most recent is first", () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);
    const result = getRecentRecipients();
    expect(result[0].address).toBe(ADDR_B);
    expect(result[1].address).toBe(ADDR_A);
  });

  it("deduplicates: re-adding an existing address moves it to front", () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);
    addRecentRecipient(ADDR_A);
    const result = getRecentRecipients();
    expect(result).toHaveLength(2);
    expect(result[0].address).toBe(ADDR_A);
    expect(result[1].address).toBe(ADDR_B);
  });

  it("caps the list at 6 entries", () => {
    [ADDR_A, ADDR_B, ADDR_C, ADDR_D, ADDR_E, ADDR_F, ADDR_G].forEach(
      addRecentRecipient
    );
    const result = getRecentRecipients();
    expect(result).toHaveLength(6);
    expect(result[0].address).toBe(ADDR_G);
  });

  it("ignores empty and whitespace-only addresses", () => {
    addRecentRecipient("");
    addRecentRecipient("   ");
    expect(getRecentRecipients()).toHaveLength(0);
  });

  it("trims whitespace from addresses before storing", () => {
    addRecentRecipient(`  ${ADDR_A}  `);
    const result = getRecentRecipients();
    expect(result[0].address).toBe(ADDR_A);
  });

  it("clearRecentRecipients removes all entries", () => {
    addRecentRecipient(ADDR_A);
    clearRecentRecipients();
    expect(getRecentRecipients()).toHaveLength(0);
  });
});

describe("RecentRecipients component", () => {
  it("renders nothing when there are no recent recipients", () => {
    const { container } = render(
      <RecentRecipients onSelect={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a pill for each recent recipient", async () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("displays truncated addresses in pill labels", async () => {
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    const pill = screen.getByRole("button");
    expect(pill.textContent).toMatch(/^GAHJJJ…AKZK7G$/);
  });

  it("exposes the full address in aria-label for screen readers", async () => {
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(
      screen.getByRole("button", {
        name: `Use recent recipient ${ADDR_A}`,
      })
    ).toBeInTheDocument();
  });

  it("exposes the full address as title tooltip", async () => {
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getByRole("button")).toHaveAttribute("title", ADDR_A);
  });

  it("calls onSelect with the full address when a pill is clicked", async () => {
    const onSelect = jest.fn();
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={onSelect} />);
    });

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(ADDR_A);
  });

  it("renders pills in most-recent-first order", async () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute(
      "aria-label",
      `Use recent recipient ${ADDR_B}`
    );
    expect(buttons[1]).toHaveAttribute(
      "aria-label",
      `Use recent recipient ${ADDR_A}`
    );
  });

  it("renders at most 6 pills even when more addresses are stored", async () => {
    [ADDR_A, ADDR_B, ADDR_C, ADDR_D, ADDR_E, ADDR_F, ADDR_G].forEach(
      addRecentRecipient
    );

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("renders the 'Recent' label when recipients exist", async () => {
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getByText("Recent")).toBeInTheDocument();
  });

  it("all pills are type=button to avoid accidental form submission", async () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toHaveAttribute("type", "button");
    });
  });

  it("applies an extra className to the wrapper when provided", async () => {
    addRecentRecipient(ADDR_A);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <RecentRecipients onSelect={jest.fn()} className="my-extra-class" />
      ));
    });

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("recent-recipients");
    expect(wrapper).toHaveClass("my-extra-class");
  });

  it("has aria-label on the wrapper for landmark context", async () => {
    addRecentRecipient(ADDR_A);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<RecentRecipients onSelect={jest.fn()} />));
    });

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute(
      "aria-label",
      "Recently used recipients"
    );
  });

  it("renders a list element for the rail", async () => {
    addRecentRecipient(ADDR_A);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("each pill item is a list item inside the rail", async () => {
    addRecentRecipient(ADDR_A);
    addRecentRecipient(ADDR_B);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("short addresses are not truncated", async () => {
    const shortAddr = "GABC123";
    addRecentRecipient(shortAddr);

    await act(async () => {
      render(<RecentRecipients onSelect={jest.fn()} />);
    });

    expect(screen.getByRole("button").textContent).toBe(shortAddr);
  });
});
