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
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show the pulse animation (default: true). Set false for reduced-motion users. */
  animate?: boolean
}

function Skeleton({
  className,
  animate = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-white/10",
        animate && "animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
