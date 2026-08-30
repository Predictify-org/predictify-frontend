import { useState, useEffect } from "react"

/**
 * Reads `prefers-reduced-motion` and tracks its value across the lifetime
 * of the component.
 *
 * The initial state is read synchronously from `window.matchMedia` so the
 * first render already reflects the user's preference. This avoids a
 * one-frame flash where motion-sensitive users briefly see the animated
 * state (e.g. loading skeletons, animated banners) before the hook's
 * internal effect resyncs.
 *
 * SSR-safe: `typeof window === "undefined"` returns `false` so server
 * output is deterministic (animations are not active on the server).
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    // Only sync if the value disagrees with what we read at init time.
    // This avoids triggering a redundant render when both reads agree.
    if (mediaQuery.matches !== reducedMotion) {
      setReducedMotion(mediaQuery.matches)
    }

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [reducedMotion])

  return reducedMotion
}
