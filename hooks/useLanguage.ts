"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStoredLanguage,
  saveLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/app/i18n";

/**
 * useLanguage — React hook for the language preference setting.
 *
 * Reads from localStorage on mount, persists changes, and syncs across tabs
 * via the storage event.  The `isReady` flag prevents a hydration flash by
 * signalling when the client-side value has been loaded.
 *
 * @example
 * const { language, setLanguage, isReady, languages } = useLanguage();
 */
export function useLanguage() {
  const [languageCode, setLanguageCode] = useState<string>("en");
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    const stored = getStoredLanguage();
    setLanguageCode(stored);
    // Apply to the document so assistive tech picks it up immediately.
    document.documentElement.lang = stored;
    setIsReady(true);
  }, []);

  // Sync across tabs.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "predictify-language" && e.newValue) {
        const valid = SUPPORTED_LANGUAGES.some((l) => l.code === e.newValue);
        if (valid) setLanguageCode(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setLanguage = useCallback((code: string) => {
    const valid = SUPPORTED_LANGUAGES.some((l) => l.code === code);
    if (!valid) return;
    setLanguageCode(code);
    saveLanguage(code);
  }, []);

  const currentLanguage: Language | undefined = SUPPORTED_LANGUAGES.find(
    (l) => l.code === languageCode
  );

  return {
    /** BCP-47 code of the currently active language. */
    languageCode,
    /** Full Language object for the active language. */
    language: currentLanguage,
    /** Update and persist the language preference. */
    setLanguage,
    /** True once the client-side value has been loaded (avoids hydration flash). */
    isReady,
    /** All supported languages for rendering a selector. */
    languages: SUPPORTED_LANGUAGES,
  } as const;
}
