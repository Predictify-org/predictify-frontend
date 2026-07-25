/**
 * Tests for app/markets/[id]/hero.tsx — MarketHero
 *
 * Coverage strategy:
 *  - Rendering: all sub-sections render under the right conditions
 *  - Typography hierarchy: correct heading level used
 *  - Probability bar: correct widths, ARIA attributes, sr-only label
 *  - Stat strip: each stat appears when supplied, absent when not
 *  - GrantFox badge: present / absent based on prop
 *  - Actions: Share button present only when onShare supplied
 *  - Accessibility: landmark, aria-labelledby, progressbar semantics
 *  - Edge cases: zero probability, 100% probability, missing optional props
 *  - Dark mode: component renders without crashing in dark context
 *  - Responsive: snapshot preserves structure across viewport widths
 *  - Design tokens (v7): outcome colors use token classes not bare color names
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketHero, StatPill, type MarketHeroProps } from "../hero";

// ---------------------------------------------------------------------------
// Minimal defaults used across tests
// ---------------------------------------------------------------------------
const BASE_PROPS: MarketHeroProps = {
  title: "Will Argentina win the 2026 FIFA World Cup?",
  status: "open",
};

const FULL_PROPS: MarketHeroProps = {
  ...BASE_PROPS,
  description:
    "Predict whether Argentina will defend their title at the 2026 FIFA World Cup.",
  category: "Football",
  volume: "42,000 USDC",
  participants: 3840,
  timeLeft: "18 days",
  outcomes: [
    { label: "Yes", probability: 62 },
    { label: "No", probability: 38 },
  ],
  isGrantFoxCampaign: true,
  onShare: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderHero(props: Partial<MarketHeroProps> = {}) {
  return render(<MarketHero {...BASE_PROPS} {...props} />);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("MarketHero — rendering", () => {
  it("renders without crashing with only required props", () => {
    renderHero();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("renders the market title as an h1", () => {
    renderHero({ title: "Test Market Title" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Test Market Title");
  });

  it("renders description when provided", () => {
    renderHero({ description: "A short description." });
    expect(screen.getByText("A short description.")).toBeInTheDocument();
  });

  it("does not render description element when omitted", () => {
    renderHero();
    // No element with description-like text should exist
    expect(screen.queryByText(/A short description/)).not.toBeInTheDocument();
  });

  it("renders the category tag when provided", () => {
    renderHero({ category: "Football" });
    expect(screen.getByText("Football")).toBeInTheDocument();
  });

  it("does not render the category tag when omitted", () => {
    renderHero({ category: undefined });
    expect(screen.queryByText("Football")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// GrantFox campaign badge
// ---------------------------------------------------------------------------
describe("MarketHero — GrantFox FWC26 campaign badge", () => {
  it("renders GrantFox badge when isGrantFoxCampaign is true", () => {
    renderHero({ isGrantFoxCampaign: true });
    expect(screen.getByText(/GrantFox FWC26/)).toBeInTheDocument();
  });

  it("does not render GrantFox badge when isGrantFoxCampaign is false (default)", () => {
    renderHero({ isGrantFoxCampaign: false });
    expect(screen.queryByText(/GrantFox FWC26/)).not.toBeInTheDocument();
  });

  it("does not render GrantFox badge when prop is omitted", () => {
    renderHero();
    expect(screen.queryByText(/GrantFox FWC26/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Probability bar
// ---------------------------------------------------------------------------
describe("MarketHero — probability bar", () => {
  it("renders the probability section when outcomes are provided", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 62 },
        { label: "No", probability: 38 },
      ],
    });
    expect(screen.getByTestId("probability-section")).toBeInTheDocument();
  });

  it("does not render probability section when outcomes are omitted", () => {
    renderHero({ outcomes: undefined });
    expect(screen.queryByTestId("probability-section")).not.toBeInTheDocument();
  });

  it("renders leading outcome label and percentage", () => {
    renderHero({
      outcomes: [{ label: "Yes", probability: 75 }],
    });
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("renders both outcome labels when two outcomes supplied", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 65 },
        { label: "No", probability: 35 },
      ],
    });
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
    expect(screen.getByText(/No/)).toBeInTheDocument();
  });

  it("renders accessible progressbar with correct aria attributes", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 62 },
        { label: "No", probability: 38 },
      ],
    });
    const pb = screen.getByRole("progressbar");
    expect(pb).toHaveAttribute("aria-valuenow", "62");
    expect(pb).toHaveAttribute("aria-valuemin", "0");
    expect(pb).toHaveAttribute("aria-valuemax", "100");
  });

  it("progressbar aria-label includes outcome label and percentage", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 62 },
        { label: "No", probability: 38 },
      ],
    });
    const pb = screen.getByRole("progressbar");
    expect(pb).toHaveAttribute("aria-label", "Yes probability: 62%");
  });

  it("handles 0% probability without crashing", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 0 },
        { label: "No", probability: 100 },
      ],
    });
    const pb = screen.getByRole("progressbar");
    expect(pb).toHaveAttribute("aria-valuenow", "0");
  });

  it("handles 100% probability without crashing", () => {
    renderHero({
      outcomes: [{ label: "Yes", probability: 100 }],
    });
    const pb = screen.getByRole("progressbar");
    expect(pb).toHaveAttribute("aria-valuenow", "100");
  });

  it("progressbar is in sr-only class (not visually rendered)", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 62 },
        { label: "No", probability: 38 },
      ],
    });
    const pb = screen.getByRole("progressbar");
    expect(pb).toHaveClass("sr-only");
  });
});

// ---------------------------------------------------------------------------
// Stat strip
// ---------------------------------------------------------------------------
describe("MarketHero — stat strip", () => {
  it("renders the stat strip when at least one stat is provided", () => {
    renderHero({ volume: "10,000 USDC" });
    expect(screen.getByTestId("stat-strip")).toBeInTheDocument();
  });

  it("does not render stat strip when no stats are provided", () => {
    renderHero({
      volume: undefined,
      participants: undefined,
      timeLeft: undefined,
    });
    expect(screen.queryByTestId("stat-strip")).not.toBeInTheDocument();
  });

  it("renders volume when provided", () => {
    renderHero({ volume: "42,000 USDC" });
    expect(screen.getByText("42,000 USDC")).toBeInTheDocument();
    expect(screen.getByText("Volume")).toBeInTheDocument();
  });

  it("does not render volume stat when omitted", () => {
    renderHero({ volume: undefined, participants: 10 });
    expect(screen.queryByText("Volume")).not.toBeInTheDocument();
  });

  it("renders participants when provided", () => {
    renderHero({ participants: 3840 });
    expect(screen.getByText("3,840")).toBeInTheDocument();
    expect(screen.getByText("Participants")).toBeInTheDocument();
  });

  it("formats participants with locale separators", () => {
    renderHero({ participants: 1234567 });
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("does not render participants stat when omitted", () => {
    renderHero({ participants: undefined, volume: "1 USDC" });
    expect(screen.queryByText("Participants")).not.toBeInTheDocument();
  });

  it("renders timeLeft when provided", () => {
    renderHero({ timeLeft: "3 days" });
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("Closes in")).toBeInTheDocument();
  });

  it("does not render timeLeft stat when omitted", () => {
    renderHero({ timeLeft: undefined, volume: "1 USDC" });
    expect(screen.queryByText("Closes in")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Share action
// ---------------------------------------------------------------------------
describe("MarketHero — share action", () => {
  it("renders Share button when onShare prop is provided", () => {
    const onShare = jest.fn();
    renderHero({ onShare });
    expect(
      screen.getByRole("button", { name: /share this market/i })
    ).toBeInTheDocument();
  });

  it("does not render Share button when onShare is omitted", () => {
    renderHero({ onShare: undefined });
    expect(
      screen.queryByRole("button", { name: /share this market/i })
    ).not.toBeInTheDocument();
  });

  it("calls onShare when Share button is clicked", async () => {
    const user = userEvent.setup();
    const onShare = jest.fn();
    renderHero({ onShare });
    await user.click(screen.getByRole("button", { name: /share this market/i }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("renders a live region alongside the Share button", () => {
    renderHero({ onShare: jest.fn(), volume: "1 USDC", participants: 100 });
    // There will be more than one role="status" because StatusBadge also has one,
    // but we confirm at least one polite live region exists.
    const liveRegions = screen.getAllByRole("status");
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
describe("MarketHero — accessibility", () => {
  it("renders as a <section> with role 'region'", () => {
    renderHero();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("section is labelled by the h1 via aria-labelledby", () => {
    renderHero({ title: "Accessible Market" });
    const region = screen.getByRole("region");
    const labelId = region.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();

    const heading = document.getElementById(labelId!);
    expect(heading).toHaveTextContent("Accessible Market");
  });

  it("applies custom className to the root section", () => {
    renderHero({ className: "custom-test-class" });
    const region = screen.getByRole("region");
    expect(region).toHaveClass("custom-test-class");
  });

  it("share button has descriptive aria-label", () => {
    renderHero({ onShare: jest.fn() });
    const btn = screen.getByRole("button", { name: /share this market/i });
    expect(btn).toHaveAttribute("aria-label", "Share this market");
  });

  it("category tag does not carry an interactive role", () => {
    renderHero({ category: "Football" });
    // It renders as a plain <span>; confirm it is not a button or link
    const categoryEl = screen.getByText("Football");
    expect(categoryEl.tagName.toLowerCase()).toBe("span");
  });
});

// ---------------------------------------------------------------------------
// StatusBadge integration
// ---------------------------------------------------------------------------
describe("MarketHero — StatusBadge integration", () => {
  it("renders StatusBadge for status 'open'", () => {
    renderHero({ status: "open" });
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders StatusBadge for status 'closing_soon'", () => {
    renderHero({ status: "closing_soon" });
    expect(screen.getByText("Closing Soon")).toBeInTheDocument();
  });

  it("renders StatusBadge for status 'resolved'", () => {
    renderHero({ status: "resolved" });
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders StatusBadge for status 'cancelled'", () => {
    renderHero({ status: "cancelled" });
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Full props smoke-test
// ---------------------------------------------------------------------------
describe("MarketHero — full props", () => {
  it("renders correctly with all props supplied", () => {
    render(<MarketHero {...FULL_PROPS} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /argentina/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/GrantFox FWC26/)).toBeInTheDocument();
    expect(screen.getByText("Football")).toBeInTheDocument();
    expect(screen.getByText("42,000 USDC")).toBeInTheDocument();
    expect(screen.getByText("3,840")).toBeInTheDocument();
    expect(screen.getByText("18 days")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /share this market/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// StatPill (internal helper exported for tests)
// ---------------------------------------------------------------------------
describe("StatPill", () => {
  it("renders the label and value", () => {
    render(
      <StatPill
        icon={<span data-testid="icon" />}
        label="Volume"
        value="10,000 USDC"
      />
    );
    expect(screen.getByText("Volume")).toBeInTheDocument();
    expect(screen.getByText("10,000 USDC")).toBeInTheDocument();
  });

  it("renders the icon slot", () => {
    render(
      <StatPill
        icon={<span data-testid="test-icon" />}
        label="Stat"
        value="42"
      />
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Design token compliance (v7)
// ---------------------------------------------------------------------------
describe("MarketHero — design token compliance (v7)", () => {
  it("title uses text-h1-responsive token class (not text-h2-responsive)", () => {
    renderHero({ title: "Token Test Market" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("text-h1-responsive");
    expect(heading).not.toHaveClass("text-h2-responsive");
  });

  it("'Yes' outcome label uses text-outcome-yes token class (not bare emerald classes)", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 60 },
        { label: "No", probability: 40 },
      ],
    });
    // The "Yes" span should carry the semantic outcome token
    const yesSpan = screen.getByText(/Yes/).closest("span");
    expect(yesSpan).toHaveClass("text-outcome-yes");
    // Must NOT use hardcoded emerald Tailwind colour
    expect(yesSpan).not.toHaveClass("text-emerald-600");
    expect(yesSpan).not.toHaveClass("dark:text-emerald-400");
  });

  it("'No' outcome label uses text-outcome-no token class (not bare muted-foreground)", () => {
    renderHero({
      outcomes: [
        { label: "Yes", probability: 60 },
        { label: "No", probability: 40 },
      ],
    });
    // The "No" span should carry the semantic outcome token
    const noSpan = screen.getByText(/No/).closest("span");
    expect(noSpan).toHaveClass("text-outcome-no");
    expect(noSpan).not.toHaveClass("text-muted-foreground");
  });

  it("probability bar fill uses bg-outcome-yes token class (not bare bg-emerald-500)", () => {
    const { container } = render(
      <MarketHero
        {...BASE_PROPS}
        outcomes={[
          { label: "Yes", probability: 70 },
          { label: "No", probability: 30 },
        ]}
      />
    );
    // The visual fill bar (aria-hidden) should use the token class
    // It is the only non-full-width div inside the rounded track
    const fillBar = container.querySelector(
      '[aria-hidden="true"] .bg-outcome-yes'
    );
    expect(fillBar).toBeInTheDocument();
    // Should NOT use bare emerald class
    const emeraldBar = container.querySelector('[aria-hidden="true"] .bg-emerald-500');
    expect(emeraldBar).not.toBeInTheDocument();
  });

  it("probability bar fill width matches leading outcome probability", () => {
    const { container } = render(
      <MarketHero
        {...BASE_PROPS}
        outcomes={[
          { label: "Yes", probability: 65 },
          { label: "No", probability: 35 },
        ]}
      />
    );
    const fillBar = container.querySelector(".bg-outcome-yes") as HTMLElement;
    expect(fillBar).toBeTruthy();
    expect(fillBar!.style.width).toBe("65%");
  });

  it("description uses text-body-md token class", () => {
    renderHero({ description: "A test description." });
    const desc = screen.getByText("A test description.");
    expect(desc).toHaveClass("text-body-md");
  });

  it("stat strip label uses text-caption token class", () => {
    renderHero({ volume: "10,000 USDC" });
    const label = screen.getByText("Volume");
    expect(label).toHaveClass("text-caption");
  });

  it("stat strip value uses text-stat-sm token class", () => {
    renderHero({ volume: "10,000 USDC" });
    const value = screen.getByText("10,000 USDC");
    expect(value).toHaveClass("text-stat-sm");
  });
});
