/**
 * consent.ts
 *
 * Client-side store for the user's usage-analytics consent preference.
 * Gated in optimistic-default style: consent is `false` until the user
 * explicitly opts in from the privacy settings page. All recommendation
 * telemetry is suppressed while consent is `false`.
 *
 * Invariants
 * ----------
 * - `analyticsConsent` is a strict boolean. Any invalid value written to
 *   localStorage (e.g. a corrupted payload) is coerced via `parseConsent`
 *   so it can never put the store into an inconsistent state.
 * - Consent defaults to `false` ("no telemetry") and can only become `true`
 *   through an explicit user action (`setAnalyticsConsent`).
 * - Reads and writes are failure-tolerant: a blocked or throwing
 *   localStorage never crashes the app — telemetry simply stays disabled.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const CONSENT_STORAGE_KEY = "predictify-consent";

interface ConsentState {
  /** Whether the user has opted in to usage analytics. */
  analyticsConsent: boolean;
  /** Set the consent value. Call from an explicit opt-in/opt-out UI action. */
  setAnalyticsConsent: (consent: boolean) => void;
  /** Toggle consent; returns the new value. */
  toggleAnalyticsConsent: () => boolean;
}

/**
 * Coerce an unknown persisted value into a strict boolean. Anything that is
 * not exactly `true` maps to `false` so the optimistic-default invariant
 * always holds, even against corrupted or malicious localStorage payloads.
 */
export function parseConsent(value: unknown): boolean {
  return value === true;
}

/**
 * A no-op storage used on the server (or when localStorage is unavailable)
 * so persistence never throws during SSR or privacy-restricted sessions.
 */
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function createSafeStorage(): ReturnType<typeof createJSONStorage> {
  if (typeof window === "undefined") {
    return createJSONStorage(() => noopStorage);
  }
  try {
    return createJSONStorage(() => window.localStorage);
  } catch {
    return createJSONStorage(() => noopStorage);
  }
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      analyticsConsent: false,

      setAnalyticsConsent: (consent) =>
        set({ analyticsConsent: parseConsent(consent) }),

      toggleAnalyticsConsent: () => {
        const next = !get().analyticsConsent;
        set({ analyticsConsent: next });
        return next;
      },
    }),
    {
      name: CONSENT_STORAGE_KEY,
      storage: createSafeStorage(),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ConsentState>),
        // Enforce the strict-boolean invariant on any persisted payload so a
        // stale or corrupted value can never turn telemetry on without an
        // explicit opt-in.
        analyticsConsent: parseConsent(
          (persisted as Partial<ConsentState> | undefined)?.analyticsConsent
        ),
      }),
      partialize: (state) => ({ analyticsConsent: state.analyticsConsent }),
    }
  )
);

/** Non-hook accessor for reads outside React (e.g. before render). */
export function getAnalyticsConsent(): boolean {
  return parseConsent(useConsentStore.getState().analyticsConsent);
}