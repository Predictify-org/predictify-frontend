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
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/10",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
