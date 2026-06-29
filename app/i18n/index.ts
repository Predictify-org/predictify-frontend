/**
 * i18n — Language preference module
 *
 * Provides the list of supported UI languages, a localStorage-backed hook for
 * reading/writing the active language, and a thin helper layer so other modules
 * can access the current language without mounting a React component.
 */

export type Language = {
  /** BCP-47 language tag used as the stored key and <html lang> value. */
  code: string;
  /** Human-readable display name shown in the Settings UI. */
  label: string;
  /** Native-script display name for accessibility. */
  nativeLabel: string;
};

/** All languages surfaced in the Settings > Language page. */
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "中文（简体）" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
];

const STORAGE_KEY = "predictify-language";
const DEFAULT_LANGUAGE = "en";

/**
 * Returns the stored language code, falling back to the browser's preferred
 * language (if supported) or "en".
 */
export function getStoredLanguage(): string {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
      return stored;
    }
    // Try to match the browser locale (first segment only, e.g. "en-US" → "en").
    const browserLang = navigator.language?.split("-")[0] ?? DEFAULT_LANGUAGE;
    if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) {
      return browserLang;
    }
  } catch {
    // localStorage may be unavailable (private browsing / SSR).
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Persists a language code to localStorage and updates the document's lang
 * attribute so assistive technologies reflect the change immediately.
 */
export function saveLanguage(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    // Broadcast to other tabs so their UI stays in sync.
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: code })
    );
  } catch {
    // Silently ignore storage errors.
  }
}

/** Returns the Language object for the given code, or undefined if not found. */
export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}
