/**
 * Tests for the i18n translation layer.
 *
 * Covers:
 *  - `interpolate()` — placeholder substitution edge cases.
 *  - `createTranslator()` — translation lookup, fallback, and warnings.
 *  - `getTranslator()` — locale selection with and without explicit locale.
 *  - `getMessages()` — catalog loader and fallback to English.
 *  - English catalog — structural integrity checks.
 *  - `AVAILABLE_LOCALES` — at minimum includes "en".
 */

import {
  interpolate,
  createTranslator,
  getTranslator,
  getMessages,
  AVAILABLE_LOCALES,
  defaultMessages,
} from "@/app/i18n";

// ── interpolate ───────────────────────────────────────────────────────────────

describe("interpolate", () => {
  it("returns the message unchanged when no vars are provided", () => {
    expect(interpolate("Hello, world!")).toBe("Hello, world!");
  });

  it("replaces a single placeholder", () => {
    expect(interpolate("Welcome, {name}!", { name: "Alice" })).toBe(
      "Welcome, Alice!"
    );
  });

  it("replaces multiple distinct placeholders", () => {
    const result = interpolate("Hello {first} {last}!", {
      first: "John",
      last: "Doe",
    });
    expect(result).toBe("Hello John Doe!");
  });

  it("replaces the same placeholder appearing multiple times", () => {
    expect(interpolate("{x} + {x} = {y}", { x: "1", y: "2" })).toBe(
      "1 + 1 = 2"
    );
  });

  it("leaves un-matched placeholders intact", () => {
    expect(interpolate("Hello {name}!", {})).toBe("Hello {name}!");
  });

  it("coerces numeric values to strings", () => {
    expect(interpolate("{count} participants", { count: 42 })).toBe(
      "42 participants"
    );
  });

  it("returns empty string when message is empty", () => {
    expect(interpolate("", { name: "x" })).toBe("");
  });
});

// ── createTranslator ──────────────────────────────────────────────────────────

describe("createTranslator", () => {
  const messages = {
    "nav.dashboard": "Dashboard",
    "greeting.welcome": "Welcome, {name}!",
    "count.items": "{count} items",
  };
  const t = createTranslator(messages);

  it("returns the translated string for a known key", () => {
    expect(t("nav.dashboard")).toBe("Dashboard");
  });

  it("interpolates variables into the message", () => {
    expect(t("greeting.welcome", { name: "Bob" })).toBe("Welcome, Bob!");
  });

  it("returns the key itself when the key is missing", () => {
    expect(t("unknown.key")).toBe("unknown.key");
  });

  it("logs a warning in development for a missing key", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    // Jest runs in 'test' which is non-production, so the warning fires.
    t("definitely.missing");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("definitely.missing")
    );
    warn.mockRestore();
    // Restore env in case it was changed
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, configurable: true });
  });

  it("works with no variables even when the message has no placeholders", () => {
    expect(t("nav.dashboard", {})).toBe("Dashboard");
  });

  it("handles numeric interpolation values", () => {
    expect(t("count.items", { count: 5 })).toBe("5 items");
  });
});

// ── getMessages ───────────────────────────────────────────────────────────────

describe("getMessages", () => {
  it("returns the English catalog for 'en'", () => {
    const msgs = getMessages("en");
    expect(typeof msgs).toBe("object");
    expect(msgs["nav.dashboard"]).toBe("Dashboard");
  });

  it("falls back to English for an unregistered locale", () => {
    const msgs = getMessages("xx-UNKNOWN");
    expect(msgs["nav.dashboard"]).toBe("Dashboard");
  });

  it("returns the same reference on repeated calls for the same locale", () => {
    expect(getMessages("en")).toBe(getMessages("en"));
  });
});

// ── getTranslator ─────────────────────────────────────────────────────────────

describe("getTranslator", () => {
  it("returns a working translator for the English locale", () => {
    const t = getTranslator("en");
    expect(typeof t).toBe("function");
    expect(t("nav.dashboard")).toBe("Dashboard");
  });

  it("falls back to English for an unknown locale", () => {
    const t = getTranslator("zz");
    expect(t("nav.dashboard")).toBe("Dashboard");
  });

  it("interpolates variables correctly", () => {
    const t = getTranslator("en");
    expect(t("dashboard.welcome", { name: "Alice" })).toBe(
      "Welcome back, Alice!"
    );
  });
});

// ── English catalog structural checks ────────────────────────────────────────

describe("defaultMessages (English catalog)", () => {
  it("contains at least 50 translation keys", () => {
    expect(Object.keys(defaultMessages).length).toBeGreaterThanOrEqual(50);
  });

  it("every key is a non-empty string", () => {
    for (const key of Object.keys(defaultMessages)) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("every value is a non-empty string", () => {
    for (const [key, value] of Object.entries(defaultMessages)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0, `Key "${key}" has an empty value`);
    }
  });

  it("all keys follow the dot-separated namespace convention", () => {
    for (const key of Object.keys(defaultMessages)) {
      expect(key).toMatch(/^[a-z0-9_]+(\.[a-z0-9_.]+)+$/);
    }
  });

  it("includes navigation keys", () => {
    expect(defaultMessages["nav.dashboard"]).toBeDefined();
    expect(defaultMessages["nav.settings"]).toBeDefined();
  });

  it("includes wallet keys", () => {
    expect(defaultMessages["wallet.connect_title"]).toBeDefined();
    expect(defaultMessages["wallet.connecting"]).toBeDefined();
  });

  it("includes accessibility keys", () => {
    expect(defaultMessages["a11y.close_dialog"]).toBeDefined();
    expect(defaultMessages["a11y.loading"]).toBeDefined();
  });

  it("includes error and feedback keys", () => {
    expect(defaultMessages["error.generic"]).toBeDefined();
    expect(defaultMessages["feedback.copied"]).toBeDefined();
  });

  it("the welcome message contains a {name} placeholder", () => {
    expect(defaultMessages["dashboard.welcome"]).toContain("{name}");
  });

  it("placeholder variables use the {word} format only", () => {
    const placeholderRe = /\{[^}]+\}/g;
    const identifierRe = /^\{\w+\}$/;
    for (const [key, value] of Object.entries(defaultMessages)) {
      const matches = value.match(placeholderRe) ?? [];
      for (const match of matches) {
        expect(match).toMatch(identifierRe, `Invalid placeholder "${match}" in key "${key}"`);
      }
    }
  });
});

// ── AVAILABLE_LOCALES ─────────────────────────────────────────────────────────

describe("AVAILABLE_LOCALES", () => {
  it("includes 'en'", () => {
    expect(AVAILABLE_LOCALES).toContain("en");
  });

  it("is an array of non-empty strings", () => {
    for (const code of AVAILABLE_LOCALES) {
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    }
  });
});
