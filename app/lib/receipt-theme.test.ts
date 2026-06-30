import {
  DEFAULT_ACCENT_COLOR,
  MAX_MESSAGE_LENGTH,
  isSafeLogoUrl,
  isValidAccentColor,
  normalizeReceiptTheme,
} from "./receipt-theme";

describe("receipt-theme", () => {
  describe("isValidAccentColor", () => {
    it("accepts 3- and 6-digit hex colours", () => {
      expect(isValidAccentColor("#fff")).toBe(true);
      expect(isValidAccentColor("#1f6feb")).toBe(true);
    });

    it("rejects malformed colours", () => {
      expect(isValidAccentColor("red")).toBe(false);
      expect(isValidAccentColor("#1234")).toBe(false);
      expect(isValidAccentColor(null)).toBe(false);
      expect(isValidAccentColor(undefined)).toBe(false);
    });
  });

  describe("isSafeLogoUrl", () => {
    it("accepts https URLs only", () => {
      expect(isSafeLogoUrl("https://cdn.example.com/logo.png")).toBe(true);
    });

    it("rejects unsafe or non-https URLs", () => {
      expect(isSafeLogoUrl("http://example.com/logo.png")).toBe(false);
      expect(isSafeLogoUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeLogoUrl("data:image/png;base64,AAAA")).toBe(false);
      expect(isSafeLogoUrl("not a url")).toBe(false);
      expect(isSafeLogoUrl("")).toBe(false);
    });
  });

  describe("normalizeReceiptTheme", () => {
    it("falls back to defaults for empty input", () => {
      const theme = normalizeReceiptTheme();
      expect(theme.accentColor).toBe(DEFAULT_ACCENT_COLOR);
      expect(theme.logoUrl).toBeUndefined();
      expect(theme.message).toBeUndefined();
    });

    it("keeps valid customisation and lowercases the colour", () => {
      const theme = normalizeReceiptTheme({
        logoUrl: "https://cdn.example.com/logo.png",
        accentColor: "#AABBCC",
        message: "  Thanks!  ",
      });
      expect(theme.logoUrl).toBe("https://cdn.example.com/logo.png");
      expect(theme.accentColor).toBe("#aabbcc");
      expect(theme.message).toBe("Thanks!");
    });

    it("drops unsafe logo URLs and invalid colours", () => {
      const theme = normalizeReceiptTheme({
        logoUrl: "http://insecure/logo.png",
        accentColor: "purple",
      });
      expect(theme.logoUrl).toBeUndefined();
      expect(theme.accentColor).toBe(DEFAULT_ACCENT_COLOR);
    });

    it("truncates overly long messages with an ellipsis", () => {
      const theme = normalizeReceiptTheme({ message: "a".repeat(200) });
      expect(theme.message).toHaveLength(MAX_MESSAGE_LENGTH);
      expect(theme.message?.endsWith("…")).toBe(true);
    });
  });
});
