"use client";

import { useAccessibility } from "@/context/AccessibilityContext";

/**
 * AnimatedBackground
 *
 * Decorative pulsing blobs shown on marketing/hero sections.
 * Respects both OS `prefers-reduced-motion` (via CSS) and the per-user
 * `reduceMotion` preference from AccessibilityContext (via JS class swap).
 *
 * When motion is reduced the blobs are rendered as static, non-animated
 * elements so the background texture is preserved without movement.
 */
export function AnimatedBackground() {
  const { reduceMotion } = useAccessibility();

  // When reduceMotion is on we drop the Tailwind animate-pulse class entirely.
  // The CSS [data-reduce-motion="true"] rule in globals.css also stops any
  // residual animations for consumers that don't read context directly.
  const pulseClass = reduceMotion ? "" : "animate-pulse";

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className={`absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl ${pulseClass}`}
      />
      <div
        className={`absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl ${pulseClass} delay-1000`}
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl ${pulseClass} delay-500`}
      />
    </div>
  );
}
