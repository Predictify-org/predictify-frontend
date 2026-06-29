/**
 * Tests for the useLanguage hook and the underlying i18n helpers.
 *
 * We test the pure helper functions from app/i18n directly (no React renderer
 * needed) and cover the key behaviours:
 *  - Default language falls back to "en" when nothing is stored.
 *  - A stored valid language code is returned as-is.
 *  - An unsupported code is ignored and falls back to "en".
 *  - saveLanguage persists to localStorage and updates document.lang.
 */

import {
  getStoredLanguage,
  saveLanguage,
  getLanguageByCode,
  SUPPORTED_LANGUAGES,
} from "@/app/i18n";

// ─── helpers ──────────────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  document.documentElement.lang = "";
  // Reset navigator.language to "en-US" for deterministic tests.
  Object.defineProperty(navigator, "language", {
    value: "en-US",
    configurable: true,
  });
});

// ─── getStoredLanguage ─────────────────────────────────────────────────────────

describe("getStoredLanguage", () => {
  it("returns 'en' when nothing is stored and browser lang is en-US", () => {
    expect(getStoredLanguage()).toBe("en");
  });

  it("returns a previously stored supported language", () => {
    saveLanguage("fr");
    expect(getStoredLanguage()).toBe("fr");
  });

  it("ignores an unsupported code and falls back to browser/default", () => {
    localStorageMock.setItem("predictify-language", "xx-INVALID");
    // Browser lang is "en-US" → maps to "en".
    expect(getStoredLanguage()).toBe("en");
  });

  it("matches browser locale when no preference is stored", () => {
    Object.defineProperty(navigator, "language", {
      value: "es",
      configurable: true,
    });
    expect(getStoredLanguage()).toBe("es");
  });
});

// ─── saveLanguage ──────────────────────────────────────────────────────────────

describe("saveLanguage", () => {
  it("persists the code to localStorage", () => {
    saveLanguage("de");
    expect(localStorageMock.getItem("predictify-language")).toBe("de");
  });

  it("updates document.documentElement.lang", () => {
    saveLanguage("ja");
    expect(document.documentElement.lang).toBe("ja");
  });
});

// ─── getLanguageByCode ─────────────────────────────────────────────────────────

describe("getLanguageByCode", () => {
  it("returns the Language object for a known code", () => {
    const lang = getLanguageByCode("zh");
    expect(lang).toBeDefined();
    expect(lang?.label).toBe("Chinese (Simplified)");
  });

  it("returns undefined for an unknown code", () => {
    expect(getLanguageByCode("xx")).toBeUndefined();
  });
});

// ─── SUPPORTED_LANGUAGES sanity checks ────────────────────────────────────────

describe("SUPPORTED_LANGUAGES", () => {
  it("includes at least 5 languages", () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(5);
  });

  it("every language has a non-empty code, label, and nativeLabel", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.label).toBeTruthy();
      expect(lang.nativeLabel).toBeTruthy();
    }
  });
});
