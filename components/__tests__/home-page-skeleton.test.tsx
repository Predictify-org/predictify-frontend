/**
 * Tests for HomePageSkeleton and its section sub-skeletons.
 *
 * Scope:
 *   1. Each section skeleton renders its testid container.
 *   2. Composite HomePageSkeleton renders all four sections.
 *   3. Shape parity: key elements carry the correct border-radius tokens.
 *   4. Accessibility: aria-busy + aria-label present on the composite root.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  HomePageSkeleton,
  HeroSkeleton,
  KpiStripSkeleton,
  FeaturesSkeleton,
  HowItWorksSkeleton,
} from "@/components/sections/home-page-skeleton";

// ── Section isolation ────────────────────────────────────────────────────────

describe("HeroSkeleton", () => {
  it("renders without crashing", () => {
    render(<HeroSkeleton />);
    expect(screen.getByTestId("hero-skeleton")).toBeInTheDocument();
  });

  it("renders avatar circle skeletons for the user-count strip", () => {
    render(<HeroSkeleton />);
    const circles = screen
      .getByTestId("hero-skeleton")
      .querySelectorAll(".rounded-full");
    // 3 avatar circles + badge pill + avatar label
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders progress-bar skeletons inside market rows (rounded-full h-2)", () => {
    render(<HeroSkeleton />);
    const progressBars = screen
      .getByTestId("hero-skeleton")
      .querySelectorAll(".h-2.rounded-full");
    // One per market row (3 total)
    expect(progressBars.length).toBe(3);
  });
});

describe("KpiStripSkeleton", () => {
  it("renders without crashing", () => {
    render(<KpiStripSkeleton />);
    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument();
  });

  it("renders exactly 4 metric value blocks (w-[166px] h-10)", () => {
    render(<KpiStripSkeleton />);
    const valueBlocks = screen
      .getByTestId("kpi-strip-skeleton")
      .querySelectorAll(".h-10.rounded-md");
    expect(valueBlocks.length).toBe(4);
  });
});

describe("FeaturesSkeleton", () => {
  it("renders without crashing", () => {
    render(<FeaturesSkeleton />);
    expect(screen.getByTestId("features-skeleton")).toBeInTheDocument();
  });

  it("renders 6 feature card placeholders", () => {
    render(<FeaturesSkeleton />);
    const cards = screen
      .getByTestId("features-skeleton")
      .querySelectorAll(".rounded-2xl");
    expect(cards.length).toBe(6);
  });
});

describe("HowItWorksSkeleton", () => {
  it("renders without crashing", () => {
    render(<HowItWorksSkeleton />);
    expect(screen.getByTestId("how-it-works-skeleton")).toBeInTheDocument();
  });

  it("renders 3 step-card placeholders", () => {
    render(<HowItWorksSkeleton />);
    // Each step card is a rounded-2xl inside the grid
    const cards = screen
      .getByTestId("how-it-works-skeleton")
      .querySelectorAll(".rounded-2xl");
    expect(cards.length).toBe(3);
  });
});

// ── Composite ────────────────────────────────────────────────────────────────

describe("HomePageSkeleton (composite)", () => {
  it("renders all four section skeletons", () => {
    render(<HomePageSkeleton />);
    expect(screen.getByTestId("home-page-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("hero-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("features-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works-skeleton")).toBeInTheDocument();
  });

  it("root element is marked aria-busy=true for screen readers", () => {
    render(<HomePageSkeleton />);
    const root = screen.getByTestId("home-page-skeleton");
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("root element has a descriptive aria-label", () => {
    render(<HomePageSkeleton />);
    const root = screen.getByTestId("home-page-skeleton");
    expect(root).toHaveAttribute("aria-label", "Loading home page content");
  });
});
