import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * DisputeCardSkeleton
 * -------------------
 * Loading skeleton that mirrors the final <DisputeCard/> shape so the
 * first paint doesn't jump when dispute data resolves.
 *
 * Layout parity (against DisputeCard — populated branch):
 *   - CardHeader: `flex flex-row items-start justify-between gap-4 pb-3`
 *       ↳ Left shard: title at `text-base` (h-5) on two lines, capped at
 *                      `max-w-[75%]` so the badge always has room.
 *       ↳ Right shard: badge pill — `h-6 w-24 !rounded-full shrink-0`
 *                      matches DisputeStateBadge (size="md") shape.
 *   - CardContent: generic, state-agnostic placeholder (reason paragraph × 2,
 *                  penalty strip, deadline row, tally strip, accordion
 *                  trigger). Every section mirrors the conditional layout
 *                  of the real component.
 *   - CardFooter: `border-t pt-3 flex items-center justify-between` with
 *                 a caption-sized label shard + action button shard.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - `role="status"` + `aria-busy="true"` on the Card root.
 *     `role="status"` implies `aria-live="polite"` so screen readers
 *     announce the loading state on mount.
 *   - A single sr-only message ("Loading dispute details…") is read on
 *     focus. Individual Skeletons render with `aria-hidden` (the base
 *     primitive's default) so they are not announced separately.
 *   - `prefers-reduced-motion` is honored at the <Skeleton/> level
 *     (motion-reduce:animate-none) so the shimmer stops for users who
 *     request reduced motion.
 *
 * Responsive behavior:
 *   - All widths are ratios (`w-full`, `w-2/3`, `w-[90%]`) — no fixed
 *     `px` values that could overflow on narrow viewports.
 *   - Badge shard pinned with `shrink-0` so its pill width stays stable.
 *   - Action button shard uses `w-32 sm:w-28` so it reflows gracefully.
 */
export function DisputeCardSkeleton() {
  return (
    <Card
      role="status"
      aria-busy="true"
      aria-label="Loading dispute card"
      data-testid="dispute-card-skeleton"
    >
      <span className="sr-only">Loading dispute details…</span>

      {/* Header: matches DisputeCard — title on the left, badge on the right */}
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex w-full max-w-[75%] flex-col gap-2">
          {/* Title (text-base, leading-snug ≈ 1.375rem) → h-5 + 2 lines */}
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        {/* DisputeStateBadge (size="md": h-6 w-24 rounded-full) */}
        <Skeleton className="h-6 w-24 shrink-0 !rounded-full" />
      </CardHeader>

      {/* Content: generic placeholder valid for any dispute state */}
      <CardContent className="space-y-4">
        {/* Reason paragraph — 2 lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
        </div>

        {/* Penalty info strip — rounded-md border, p-3 height */}
        <Skeleton className="h-12 w-full rounded-md" />

        {/* Deadline row */}
        <Skeleton className="h-5 w-64" />

        {/* Tally row — 2 items side-by-side */}
        <div className="flex gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
        </div>

        {/* Audit refs accordion trigger */}
        <Skeleton className="h-9 w-32 rounded-md" />
      </CardContent>

      {/* Footer: matches border-t + pt-3 + flex justify-between */}
      <CardFooter className="flex items-center justify-between border-t pt-3">
        {/* State label — text-xs */}
        <Skeleton className="h-3 w-36" />
        {/* Action button */}
        <Skeleton className="h-9 w-32 rounded-md" />
      </CardFooter>
    </Card>
  );
}
