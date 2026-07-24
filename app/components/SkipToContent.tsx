/**
 * SkipToContent — "Skip to main content" accessible navigation link.
 *
 * Renders a visually-hidden anchor that becomes visible on :focus-visible,
 * allowing keyboard and screen-reader users to bypass repeated navigation and
 * jump directly to the page's primary content region.
 *
 * Usage
 * -----
 * Place this as the *first* focusable element in the document <body> (i.e.
 * before any <nav> or layout chrome).  The target element must carry a
 * matching `id` attribute — conventionally `id="main-content"`.
 *
 * ```tsx
 * // app/layout.tsx
 * import { SkipToContent } from "@/components/SkipToContent"
 *
 * <body>
 *   <SkipToContent />
 *   <Providers>{children}</Providers>
 * </body>
 * ```
 *
 * WCAG 2.1 compliance
 * -------------------
 * - Success Criterion 2.4.1 — Bypass Blocks (Level A)
 * - Success Criterion 2.4.3 — Focus Order (Level A)
 * - Uses .skip-link CSS class defined in app/styles/focus.css for the
 *   enhanced 4 px focus ring required when the link is the sole focus cue.
 */

interface SkipToContentProps {
  /**
   * The `id` of the main content container to jump to.
   * Defaults to "main-content" which matches the id applied in the shared
   * layout files.
   */
  targetId?: string
  /**
   * Human-readable label announced by screen readers.
   * Defaults to "Skip to main content".
   */
  label?: string
}

export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={[
        // Visually hidden until focused — SR-friendly clip pattern
        "skip-link",
        "sr-only",
        "focus:not-sr-only",
        // Positioning: fixed so it floats above all layout chrome
        "focus:fixed",
        "focus:top-4",
        "focus:left-4",
        "focus:z-[9999]",
        // Visual treatment using design tokens for dark-mode consistency
        "focus:inline-block",
        "focus:rounded-md",
        "focus:bg-background",
        "focus:px-4",
        "focus:py-2",
        "focus:text-sm",
        "focus:font-semibold",
        "focus:text-foreground",
        "focus:shadow-lg",
        "focus:ring-2",
        "focus:ring-ring",
        "focus:ring-offset-2",
      ].join(" ")}
    >
      {label}
    </a>
  )
}
