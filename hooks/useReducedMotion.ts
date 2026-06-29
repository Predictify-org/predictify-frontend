import { useState, useEffect } from "react"

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mediaQuery.matches)

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [])

  return reducedMotion;
}