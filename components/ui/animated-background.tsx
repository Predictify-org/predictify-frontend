"use client";

import { useAccessibility } from "@/context/AccessibilityContext";

/**
 * AnimatedBackground
 *
 * Decorative pulsing blobs rendered behind marketing/hero sections.
 *
 * Motion behaviour
 * ─────────────────
 * When the user has enabled "Reduce motion" in Settings → Accessibility
 * (or the OS prefers-reduced-motion media query fires), the animate-pulse
 * Tailwind class is removed and the blobs render as static colour washes.
 * The CSS [data-reduce-motion="true"] rule in globals.css provides the
 * same guarantee for any residual CSS animations we might have missed.
 */
export function AnimatedBackground() {
  const { reduceMotion } = useAccessibility();
  const pulse = reduceMotion ? "" : "animate-pulse";

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className={`absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl ${pulse}`} />
      <div className={`absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl ${pulse} delay-1000`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl ${pulse} delay-500`} />
    </div>
  );
}
