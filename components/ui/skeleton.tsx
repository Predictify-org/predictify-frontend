import { cn } from "@/lib/utils"

/**
 * Skeleton — base animated pulse placeholder.
 *
 * Shape-parity guidelines for /home:
 *   - Text lines   → h-4  rounded-md  (default)
 *   - Headings     → h-8  rounded-md
 *   - Buttons      → h-11 rounded-xl
 *   - Cards        → rounded-2xl
 *   - Avatar/orb   → rounded-full
 *   - Progress bar → h-2  rounded-full
 *   - Badge/pill   → h-6  rounded-full
 *
 * Pass the appropriate className to match the real element's border-radius
 * and dimensions so the loading state preserves layout shape parity.
 *
 * Design-token + accessibility notes:
 *   - Uses `bg-muted` (design token) so dark mode is handled automatically.
 *     Was previously `bg-white/10` — dropped because it disappeared in dark
 *     mode and was off-token. This change cascades to every Skeleton
 *     call-site in the repo (#630 notes this as a cross-cutting effect).
 *   - `motion-reduce:animate-none` honors the user's prefers-reduced-motion
 *     preference at the component level.
 *   - Each shard defaults to `aria-hidden="true"` so a single loading region
 *     with `role="status"` + `aria-busy` can announce a clean status without
 *     repeating every shimmer. Callers can override by passing
 *     `aria-hidden={false}` (e.g., when an individual Skeleton represents
 *     meaningful content like an image alt placeholder).
 *
 * Caveat (object-spread foot-gun):
 *   - `aria-hidden` is destructured out before `...props` reaches
 *     `React.DOMAttributes`, so callers writing
 *     `<Skeleton {...rest} />` where `rest` includes `aria-hidden` lose
 *     that value silently — the spread never reaches the rendered `<div>`.
 *     Pass `aria-hidden` as a literal prop, never via spread.
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show the pulse animation (default: true). Set false for reduced-motion users. */
  animate?: boolean
}

function Skeleton({
  className,
  // Pulled out of ...props so the default applies. See "RP destructure
  // foot-gun" note above for object-spread caveats.
  "aria-hidden": ariaHidden = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden={ariaHidden}
      className={cn(
        "animate-pulse motion-reduce:animate-none rounded-md bg-muted",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
