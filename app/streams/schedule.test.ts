import {
  calculateMonthlyProration,
  formatMonthlyScheduleSummary,
  validateMonthlyAnchorDay,
} from "./schedule";

const utcDate = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day));

describe("monthly schedule validation", () => {
  it.each([
    { value: 0, message: /between 1 and 31/i },
    { value: 32, message: /between 1 and 31/i },
    { value: 2.5, message: /integer/i },
  ])("rejects invalid anchor day $value", ({ value, message }) => {
    const error = validateMonthlyAnchorDay(value);

    expect(error).toMatch(message);
  });
});

describe("calculateMonthlyProration", () => {
  it.each([
    {
      label: "Jan 31 start",
      start: utcDate(2025, 0, 31),
      expectedDaysInMonth: 31,
      expectedActiveDays: 1,
      expectedRatio: 1 / 31,
    },
    {
      label: "Non-leap Feb mid-month",
      start: utcDate(2025, 1, 15),
      expectedDaysInMonth: 28,
      expectedActiveDays: 14,
      expectedRatio: 14 / 28,
    },
    {
      label: "Leap-year Feb 29",
      start: utcDate(2024, 1, 29),
      expectedDaysInMonth: 29,
      expectedActiveDays: 1,
      expectedRatio: 1 / 29,
    },
  ])("prorates based on actual month length for $label", (testCase) => {
    const result = calculateMonthlyProration({
      anchorDay: 31,
      monthlyAmount: 100,
      startDateUtc: testCase.start,
    });

    expect(result.daysInMonth).toBe(testCase.expectedDaysInMonth);
    expect(result.activeDays).toBe(testCase.expectedActiveDays);
    expect(result.ratio).toBeCloseTo(testCase.expectedRatio, 6);
  });

  it("treats pause on the last day as a full month", () => {
    const result = calculateMonthlyProration({
      anchorDay: 1,
      monthlyAmount: 100,
      startDateUtc: utcDate(2025, 2, 1),
      pauseDateUtc: utcDate(2025, 2, 31),
    });

    expect(result.activeDays).toBe(31);
    expect(result.daysInMonth).toBe(31);
    expect(result.ratio).toBe(1);
  });
});

describe("formatMonthlyScheduleSummary", () => {
  it("adds a DST display note when using local time", () => {
    const summary = formatMonthlyScheduleSummary({
      anchorDay: 31,
      monthlyAmount: 120,
      startDateUtc: utcDate(2025, 2, 9),
      displayTimeZone: "local",
    });

    expect(summary.label).toMatch(/dst/i);
    expect(summary.label).toMatch(/utc/i);
  });
});
