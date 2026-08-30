import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * DisputePanelSkeleton
 * --------------------
 * Loading skeleton that mirrors the final <DisputePanel/> card shape so the
 * first paint doesn't jump when data resolves.
 *
 * Layout parity (against DisputePanel — populated branch):
 *   - CardHeader: `flex flex-row items-start justify-between gap-4 pb-3`
 *       ↳ Left shard: title at `text-base` (h-5) on two lines, capped at
 *                      `max-w-[75%]` so the badge always has room.
 *       ↳ Right shard: badge pill — `h-6 w-24 !rounded-full shrink-0`
 *                      matches Badge size="md" (px-2.5 py-0.5 text-xs).
 *                      `!rounded-full` overrides the base Skeleton's default
 *                      `rounded-md` explicitly (instead of relying on
 *                      Tailwind CSS source order, which can silently flip
 *                      on theme reorderings).
 *   - CardContent: a generic, state-agnostic placeholder (paragraph block +
 *                  tally/strip + a flexible action shard). The action shard
 *                  resizes (`w-full sm:w-2/3`) so it collapses gracefully
 *                  into ANY of the 5 states (none / open / voting / ended /
 *                  executed), whose action rows have 0–2 buttons.
 *   - CardFooter: `border-t pt-3` with a small caption-sized shard, which
 *                 mirrors the `text-xs text-muted-foreground` label.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - `role="status"` + `aria-busy="true"` on the Card root. Note that
 *     `role="status"` already implies `aria-live="polite"`; we do not set
 *     it explicitly so the live region doesn't double-fire on descendant
 *     text changes (such as the badge shard swapping `aria-hidden`).
 *   - A single sr-only message ("Loading dispute details…") is read on
 *     focus. The individual Skeletons render with `aria-hidden` (the
 *     base primitive's default) so they are not announced as separate
 *     shimmer items. Modern SRs (NVDA / JAWS / VoiceOver) announce
 *     role=status text on mount; older TalkBack on Android may not —
 *     this is a known portability caveat, accepted for #630 scope.
 *   - `prefers-reduced-motion` is honored at the <Skeleton/> level
 *     (motion-reduce:animate-none) so the shimmer stops for users who
 *     request reduced motion.
 *
 * Responsive behavior:
 *   - All widths are ratios (`w-full`, `w-2/3`, `w-[90%]`, `sm:w-2/3`)
 *     — no fixed `px` values that could overflow on narrow viewports.
 *   - Badge shard pinned with `shrink-0` so its pill width stays stable.
 *   - Action shard uses `w-full sm:w-2/3` so it stretches on mobile and
 *     shrinks on ≥sm, matching the real button row's perceived width.
 */
export function DisputePanelSkeleton() {
  return (
    <Card role="status" aria-busy="true">
      <span className="sr-only">Loading dispute details…</span>

      {/* Header: matches DisputePanel — title on the left, badge on the right */}
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex w-full max-w-[75%] flex-col gap-2">
          {/* Title (text-base ≈ 1rem, line-height snug ≈ 1.375rem) → h-5 + 2 lines */}
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        {/* Badge (size="md": px-2.5 py-0.5 text-xs, rounded-full) → h-6 w-24.
            `!rounded-full` overrides the base Skeleton's default `rounded-md`
            AND applies an order-independent `!important` flag so the pill
            shape survives any future Tailwind generated-CSS source-order
            reorder.
            Assumption: this works because tailwind.config.ts keeps the default
            `important: 'never'` (we do NOT set `important: true`). If a future
            maintainer flips that flag, the `!` prefix becomes a no-op and the
            pill silently becomes a rounded-md rectangle. */}
        <Skeleton className="h-6 w-24 shrink-0 !rounded-full" />
      </CardHeader>

      {/* Content: generic placeholder valid for any of the 5 dispute states. */}
      <CardContent className="transition-all duration-300">
        <div className="flex flex-col gap-4">
          {/* Reason paragraph — short enough to never exceed realistic heights */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
          </div>

          {/* Deadline / outcome strip — matches CountdownTimer / outcome chip band */}
          <Skeleton className="h-9 w-full rounded-md" />

          {/* Action row — single flexible shard with a responsive width that
              reflows into the resolved button / actions (1 button in
              NoneState, 2 vote buttons in OpenState / VotingState, none in
              EndedState / ExecutedState). */}
          <Skeleton className="h-10 w-full sm:w-2/3 rounded-md" />
        </div>
      </CardContent>

      {/* Footer: matches border-t + pt-3 + caption-sized text */}
      <CardFooter className="border-t pt-3">
        {/* text-xs caption row */}
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}
