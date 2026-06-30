"use client";

/**
 * AccessibilityContext
 *
 * Per-user accessibility preferences that override OS-level media queries.
 * Persisted to localStorage under the key "predictify-a11y".
 *
 * Preferences
 * ───────────
 *  reduceMotion      Stops decorative animations. Defaults to OS
 *                    prefers-reduced-motion when no stored value exists.
 *  disableParallax   Removes scroll-linked depth/translate effects.
 *  disableAutoplay   Prevents carousels from auto-advancing.
 *  increaseContrast  Swaps CSS token values for higher contrast
 *                    (targets WCAG AAA where feasible).
 *
 * DOM side-effects
 * ────────────────
 * On every preference change the context writes data-attributes to <html>:
 *
 *   data-reduce-motion="true|false"
 *   data-disable-parallax="true|false"
 *   data-increase-contrast="true|false"
 *
 * CSS in globals.css targets these attributes so components that cannot
 * read React context (e.g. pure-CSS animations) still respect the user
 * preference without any JS wiring.
 *
 * disableAutoplay is JS-only (no CSS attribute needed) and is consumed
 * directly by the Carousel component via useAccessibility().
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface A11yPrefs {
  reduceMotion: boolean;
  disableParallax: boolean;
  disableAutoplay: boolean;
  increaseContrast: boolean;
}

interface A11yContextValue extends A11yPrefs {
  setReduceMotion: (v: boolean) => void;
  setDisableParallax: (v: boolean) => void;
  setDisableAutoplay: (v: boolean) => void;
  setIncreaseContrast: (v: boolean) => void;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "predictify-a11y";

/** SSR-safe OS reduced-motion check. */
function osReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function loadPrefs(): A11yPrefs {
  const defaults: A11yPrefs = {
    reduceMotion: osReducedMotion(),
    disableParallax: false,
    disableAutoplay: false,
    increaseContrast: false,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      reduceMotion:
        typeof p.reduceMotion === "boolean" ? p.reduceMotion : defaults.reduceMotion,
      disableParallax:
        typeof p.disableParallax === "boolean" ? p.disableParallax : defaults.disableParallax,
      disableAutoplay:
        typeof p.disableAutoplay === "boolean" ? p.disableAutoplay : defaults.disableAutoplay,
      increaseContrast:
        typeof p.increaseContrast === "boolean" ? p.increaseContrast : defaults.increaseContrast,
    };
  } catch {
    return defaults;
  }
}

function savePrefs(prefs: A11yPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (private mode / quota). Fail silently.
  }
}

/**
 * Writes data-* attributes to <html> so global CSS selectors work without
 * requiring every consumer to read React context.
 */
function applyDataAttrs(prefs: A11yPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.reduceMotion = String(prefs.reduceMotion);
  root.dataset.disableParallax = String(prefs.disableParallax);
  root.dataset.increaseContrast = String(prefs.increaseContrast);
}

// ── Context ───────────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<A11yContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  // Start with safe server-side defaults; hydrate from localStorage in an effect
  // so there is no SSR/client mismatch.
  const [prefs, setPrefs] = useState<A11yPrefs>({
    reduceMotion: false,
    disableParallax: false,
    disableAutoplay: false,
    increaseContrast: false,
  });

  // Hydrate once on mount
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyDataAttrs(loaded);
  }, []);

  // Persist + apply DOM attributes whenever prefs change
  useEffect(() => {
    applyDataAttrs(prefs);
    savePrefs(prefs);
  }, [prefs]);

  const setReduceMotion = useCallback(
    (v: boolean) => setPrefs((p) => ({ ...p, reduceMotion: v })),
    []
  );
  const setDisableParallax = useCallback(
    (v: boolean) => setPrefs((p) => ({ ...p, disableParallax: v })),
    []
  );
  const setDisableAutoplay = useCallback(
    (v: boolean) => setPrefs((p) => ({ ...p, disableAutoplay: v })),
    []
  );
  const setIncreaseContrast = useCallback(
    (v: boolean) => setPrefs((p) => ({ ...p, increaseContrast: v })),
    []
  );

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAccessibility(): A11yContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return ctx;
}
