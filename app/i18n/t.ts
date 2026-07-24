/**
 * i18n — Translation helpers
 *
 * `createTranslator` builds a `t()` function bound to a specific locale's
 * message catalog.  `useTranslation` is a React hook that returns a `t()`
 * function whose locale tracks the user's live language preference.
 *
 * Features:
 *  - Named placeholder interpolation: `t("key", { name: "Alice" })`
 *  - Falls back to the message key if no translation is found (never throws).
 *  - Zero runtime dependencies — works in SSR and client components.
 *  - Fully typed: keys autocomplete from the English catalog.
 */

"use client";

import { useMemo } from "react";
import type { Messages, InterpolationValues } from "./types";
import { getMessages } from "./messages/index";
import { getStoredLanguage } from "./index";
import { useLanguage } from "@/hooks/useLanguage";

// ── Core interpolation ────────────────────────────────────────────────────────

/**
 * Replaces `{variable}` placeholders in a message string with the
 * corresponding values from `vars`.
 *
 * Placeholders that have no matching key in `vars` are left as-is so the
 * developer can spot missing variables quickly.
 *
 * @example
 * interpolate("Welcome, {name}!", { name: "Alice" }) // → "Welcome, Alice!"
 * interpolate("Hello {name}!", {})                   // → "Hello {name}!"
 */
export function interpolate(
  message: string,
  vars?: InterpolationValues
): string {
  if (!vars || Object.keys(vars).length === 0) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : placeholder;
  });
}

// ── Translator factory ────────────────────────────────────────────────────────

/**
 * Creates a `t()` function bound to the provided message catalog.
 *
 * @param messages  Flat key→string map (from `getMessages(locale)`).
 * @returns         A translator function `t(key, vars?) → string`.
 *
 * @example
 * const t = createTranslator(getMessages("en"));
 * t("nav.dashboard")               // → "Dashboard"
 * t("dashboard.welcome", { name: "Bob" }) // → "Welcome back, Bob!"
 * t("nonexistent.key")             // → "nonexistent.key"  (safe fallback)
 */
export function createTranslator(messages: Messages) {
  return function t(key: string, vars?: InterpolationValues): string {
    const raw = messages[key];
    if (raw === undefined) {
      // Return the key itself so missing strings are immediately visible in UI.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing translation key: "${key}"`);
      }
      return key;
    }
    return interpolate(raw, vars);
  };
}

// ── Server-side helper ────────────────────────────────────────────────────────

/**
 * Builds a `t()` function for use outside React (e.g. API routes, metadata).
 * Reads the stored language code from localStorage when in a browser context;
 * defaults to "en" on the server.
 */
export function getTranslator(locale?: string): ReturnType<typeof createTranslator> {
  const resolvedLocale = locale ?? getStoredLanguage();
  return createTranslator(getMessages(resolvedLocale));
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * React hook that returns a `t()` function bound to the user's active locale.
 * Re-renders automatically when the user changes their language preference.
 *
 * @example
 * function MyComponent() {
 *   const { t } = useTranslation();
 *   return <h1>{t("nav.dashboard")}</h1>;
 * }
 */
export function useTranslation() {
  const { languageCode, isReady } = useLanguage();

  const t = useMemo(
    () => createTranslator(getMessages(languageCode)),
    [languageCode]
  );

  return {
    /** Translate a message key, optionally interpolating `{variable}` placeholders. */
    t,
    /** BCP-47 code of the currently active locale. */
    locale: languageCode,
    /** True once the client-side locale has been hydrated from localStorage. */
    isReady,
  } as const;
}
