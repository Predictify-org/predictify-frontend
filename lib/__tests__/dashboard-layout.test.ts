import {
  DASHBOARD_SECTIONS,
  DEFAULT_LAYOUT,
  moveSection,
  normalizeLayout,
  toggleSection,
} from "../dashboard-layout";

describe("dashboard layout helpers", () => {
  it("uses the registered default order with every section visible", () => {
    expect(DEFAULT_LAYOUT.map((section) => section.id)).toEqual(
      [...DASHBOARD_SECTIONS]
        .sort((left, right) => left.defaultOrder - right.defaultOrder)
        .map((section) => section.id),
    );
    expect(DEFAULT_LAYOUT.every((section) => section.visible)).toBe(true);
  });

  it("moves sections and leaves boundary moves unchanged", () => {
    expect(moveSection(DEFAULT_LAYOUT, "notifications", "up")).toBe(DEFAULT_LAYOUT);
    expect(moveSection(DEFAULT_LAYOUT, "activity", "down")).toBe(DEFAULT_LAYOUT);
    expect(moveSection(DEFAULT_LAYOUT, "recommendations", "down").map((item) => item.id))
      .toEqual([
        "notifications",
        "metrics",
        "recently-viewed",
        "active-bets",
        "activity",
        "recommendations",
      ]);
  });

  it("toggles visibility but does not hide the last visible section", () => {
    const hiddenMetrics = toggleSection(DEFAULT_LAYOUT, "metrics");
    expect(hiddenMetrics.find((item) => item.id === "metrics")?.visible).toBe(false);

    const onlyActivity = DEFAULT_LAYOUT.map((item) => ({
      ...item,
      visible: item.id === "activity",
    }));
    expect(toggleSection(onlyActivity, "activity")).toBe(onlyActivity);
  });

  it("drops unknown and duplicate ids, then appends missing sections", () => {
    const normalized = normalizeLayout([
      { id: "future-section", visible: true },
      { id: "active-bets", visible: false },
      { id: "active-bets", visible: true },
      { id: "metrics", visible: "hidden" },
    ]);

    expect(normalized.map((item) => item.id)).toEqual([
      "active-bets",
      "metrics",
      "notifications",
      "recently-viewed",
      "recommendations",
      "activity",
    ]);
    expect(normalized[0].visible).toBe(false);
    expect(normalized[1].visible).toBe(true);
  });

  it("returns a fresh default layout for invalid saved data", () => {
    const normalized = normalizeLayout({ layout: "invalid" });
    expect(normalized).toEqual(DEFAULT_LAYOUT);
    expect(normalized).not.toBe(DEFAULT_LAYOUT);
  });
});
