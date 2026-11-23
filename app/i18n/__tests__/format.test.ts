import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelative,
} from "@/app/i18n/format";

describe("Intl formatting helpers", () => {
  it("formats numbers using the requested locale", () => {
    expect(formatNumber(1234.5, "es", { minimumFractionDigits: 1 })).toMatch(
      /1[.,\u00a0\u202f]234,5/
    );
    expect(formatNumber(1234.5, "fr", { minimumFractionDigits: 1 })).toMatch(
      /1[.,\u00a0\u202f]234,5/
    );
  });

  it("formats currency and dates using the requested locale", () => {
    expect(formatCurrency(1234.5, "EUR", "fr")).toContain("€");
    expect(formatDate(new Date("2025-01-02T00:00:00Z"), "es", {
      timeZone: "UTC",
    })).toContain("2025");
  });

  it("formats relative time in the requested locale", () => {
    expect(
      formatRelative(
        new Date("2025-01-03T00:00:00Z"),
        "fr",
        new Date("2025-01-01T00:00:00Z")
      )
    ).toMatch(/2 jours/);
  });

  it("falls back to English for an invalid locale", () => {
    expect(formatNumber(1234.5, "not_a_locale")).toBe("1,234.5");
  });
});
