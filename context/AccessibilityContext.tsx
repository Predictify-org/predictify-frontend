"use client";

/**
 * AccessibilityContext
 *
 * Provides per-user accessibility preferences that override OS-level settings.
 * All values persist to localStorage under the "predictify-a11y" key.
 *
 * Preferences:
 *  - reduceMotion       → stops decorative animations (overrides prefers-reduced-motion)
 *  - disableParallax    → disables parallax/depth scroll effects
 *  - disableAutoplay    → prevents carousels from auto-advancing
 *  - increaseContrast   → applies a higher-contrast token swap via data attribute
 *
 * The context also reads the OS `prefers-reduced-motion` media query as the
 * default value for `reduceMotion` when no explicit user preference is stored.
 *
 * Usage:
 *   const { reduceMotion, setReduceMotion } = useAccessibility();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AccessibilityPreferences {
  /** Disable decorative animations beyond what the OS already reduces. */
  reduceMotion: boolean;
  /** Disable parallax / depth-scroll effects. */
  disableParallax: boolean;
  /** Prevent auto-playing / auto-advancing carousels. */
  disableAutoplay: boolean;
  /** Apply a high-contrast token override (targets WCAG AAA where feasible). */
  increaseContrast: boolean;
}

interface AccessibilityContextValue extends AccessibilityPreferences {
  setReduceMotion: (value: boolean) => void;
  setDisableParallax: (value: boolean) => void;
  setDisableAutoplay: (value: boolean) => void;
  setIncreaseContrast: (value: boolean) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "predictify-a11y";

/** Read the OS prefers-reduced-motion media query (SSR-safe). */
function osPreferReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Load persisted preferences, falling back to OS defaults. */
function loadPrefs(): AccessibilityPreferences {
  const defaults: AccessibilityPreferences = {
    reduceMotion: osPreferReducedMotion(),
    disableParallax: false,
    disableAutoplay: false,
    increaseContrast: false,
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      reduceMotion:
        typeof parsed.reduceMotion === "boolean"
          ? parsed.reduceMotion
          : defaults.reduceMotion,
      disableParallax:
        typeof parsed.disableParallax === "boolean"
          ? parsed.disableParallax
          : defaults.disableParallax,
      disableAutoplay:
        typeof parsed.disableAutoplay === "boolean"
          ? parsed.disableAutoplay
          : defaults.disableAutoplay,
      increaseContrast:
        typeof parsed.increaseContrast === "boolean"
          ? parsed.increaseContrast
          : defaults.increaseContrast,
    };
  } catch {
    return defaults;
  }
}

/** Persist preferences to localStorage. */
function savePrefs(prefs: AccessibilityPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded). Fail silently.
  }
}

/**
 * Apply data attributes to <html> so CSS selectors can target them globally
 * without requiring every component to read the context.
 *
 *   [data-reduce-motion="true"]   → kills decorative animations
 *   [data-increase-contrast="true"] → swaps high-contrast CSS tokens
 *   [data-disable-parallax="true"]  → signals parallax containers
 */
function applyDataAttributes(prefs: AccessibilityPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.reduceMotion = String(prefs.reduceMotion);
  root.dataset.disableParallax = String(prefs.disableParallax);
  root.dataset.increaseContrast = String(prefs.increaseContrast);
  // disableAutoplay is consumed via context only (JS-level, not CSS)
}

// ── Context ──────────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(
  undefined
);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    disableParallax: false,
    disableAutoplay: false,
    increaseContrast: false,
  });

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyDataAttributes(loaded);
  }, []);

  // Re-apply data attributes whenever prefs change
  useEffect(() => {
    applyDataAttributes(prefs);
    savePrefs(prefs);
  }, [prefs]);

  // Individual setters — each creates a new merged prefs object
  const setReduceMotion = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, reduceMotion: value }));
  }, []);

  const setDisableParallax = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, disableParallax: value }));
  }, []);

  const setDisableAutoplay = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, disableAutoplay: value }));
  }, []);

  const setIncreaseContrast = useCallback((value: boolean) => {
    setPrefs((prev) => ({ ...prev, increaseContrast: value }));
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        ...prefs,
        setReduceMotion,
        setDisableParallax,
        setDisableAutoplay,
        setIncreaseContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return ctx;
}
