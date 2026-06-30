/**
 * theme-noflash.ts — Prevents flash of incorrect theme on first paint.
 *
 * This module provides utilities to detect and apply the user's theme preference
 * before React hydration, eliminating the visual flash that occurs when the
 * default theme doesn't match the user's preference.
 *
 * Strategy:
 * 1. Check localStorage for saved theme preference
 * 2. Fall back to system preference via matchMedia
 * 3. Apply theme class to document.documentElement immediately
 * 4. Store the result for React to use during hydration
 */

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'streampay-theme';
const THEME_CLASS_DARK = 'dark';
const THEME_CLASS_LIGHT = 'light';
const HIGH_CONTRAST_STORAGE_KEY = 'streampay-high-contrast';
const HIGH_CONTRAST_CLASS = 'high-contrast';

/**
 * Gets the user's theme preference from localStorage or system settings.
 * This function is designed to be called in a blocking script before React
 * hydration to prevent theme flash.
 *
 * @returns The resolved theme ('light' or 'dark')
 */
export function getTheme(): Theme {
  // Check localStorage first (user's explicit preference)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
  } catch (e) {
    // localStorage may be unavailable (e.g., in incognito mode)
    // Fall through to system preference
  }

  // Fall back to system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  // Default to dark theme (matches current CSS)
  return 'dark';
}

/**
 * Applies the theme class to the document element.
 * This should be called immediately after detecting the theme to prevent flash.
 *
 * @param theme - The theme to apply ('light' or 'dark')
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Remove both classes first to ensure clean state
  root.classList.remove(THEME_CLASS_DARK, THEME_CLASS_LIGHT);
  
  // Add the appropriate class
  root.classList.add(theme);
  
  // Store in localStorage for persistence
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch (e) {
    // localStorage may be unavailable or full
    // Theme is still applied to DOM, so this is non-critical
  }
}

/**
 * Sets the theme preference and applies it.
 * This is the main function to call when user changes theme.
 *
 * @param theme - The theme to set ('light' or 'dark')
 */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
}

/**
 * Initializes the theme on page load to prevent flash.
 * This should be called in a blocking script in the head.
 */
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}

/**
 * Checks whether high-contrast mode was previously enabled.
 *
 * @returns `true` if high-contrast was persisted, `false` otherwise.
 */
export function getHighContrast(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
    }
  } catch (e) {
    // localStorage may be unavailable
  }
  return false;
}

/**
 * Applies or removes the high-contrast class on the document element.
 *
 * @param enabled - Whether high-contrast should be active.
 */
export function applyHighContrast(enabled: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle(HIGH_CONTRAST_CLASS, enabled);
}

/**
 * Persists and applies the high-contrast preference.
 *
 * @param enabled - Whether high-contrast should be active.
 */
export function setHighContrast(enabled: boolean): void {
  applyHighContrast(enabled);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (enabled) {
        window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(HIGH_CONTRAST_STORAGE_KEY);
      }
    }
  } catch (e) {
    // localStorage may be unavailable or full
  }
}

/**
 * Generates the inline script that should be placed in the head.
 * This script runs synchronously before React hydration.
 *
 * @returns A string containing the inline script
 */
export function getThemeScript(): string {
  return `
    (function() {
      function getTheme() {
        try {
          const stored = localStorage.getItem('${THEME_STORAGE_KEY}');
          if (stored === 'light' || stored === 'dark') {
            return stored;
          }
        } catch (e) {}
        
        if (window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        return 'dark';
      }
      
      const theme = getTheme();
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
      
      try {
        if (localStorage.getItem('${HIGH_CONTRAST_STORAGE_KEY}') === 'true') {
          document.documentElement.classList.add('${HIGH_CONTRAST_CLASS}');
        }
      } catch(e) {}
    })();
  `;
}
