/**
 * LangAttribute — Client component that keeps the document's `lang` attribute
 * in sync with the user's active language preference.
 *
 * Mount this once, near the top of the component tree (e.g. inside the root
 * `<Providers>` wrapper).  It renders nothing to the DOM; its only effect is
 * setting `document.documentElement.lang` so that:
 *  - Screen readers announce content in the correct language.
 *  - Browser translate tools activate appropriately.
 *  - CSS `:lang()` selectors work.
 *
 * The `lang="en"` attribute on `<html>` in layout.tsx remains as the SSR
 * default; this component corrects it on the client once the stored preference
 * is hydrated from localStorage.
 */
"use client";

import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * Invisible client component — updates `<html lang>` whenever the user's
 * language preference changes.
 */
export function LangAttribute() {
  const { languageCode, isReady } = useLanguage();

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.lang = languageCode;
  }, [languageCode, isReady]);

  // Renders nothing — side-effects only.
  return null;
}
