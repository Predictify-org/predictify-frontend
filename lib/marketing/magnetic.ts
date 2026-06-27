/** Maximum pixel pull applied to magnetic CTAs toward the pointer. */
export const MAX_MAGNET_PULL_PX = 6;

/** Cursor ring diameter in pixels before scaling over interactive targets. */
export const CURSOR_RING_SIZE_PX = 12;

/** Scale multiplier when the ring hovers an interactive element. */
export const CURSOR_RING_HOVER_SCALE = 2;

export type MagnetOffset = { x: number; y: number };

/**
 * Computes the visual translate offset for a magnetic CTA.
 * Pull is capped at `maxPull` px and fades with distance from the element center.
 */
export function computeMagnetOffset(
  cursorX: number,
  cursorY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  maxPull = MAX_MAGNET_PULL_PX
): MagnetOffset {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = cursorX - centerX;
  const dy = cursorY - centerY;
  const distance = Math.hypot(dx, dy);
  const influenceRadius = Math.max(rect.width, rect.height) * 1.5;

  if (distance >= influenceRadius || distance === 0) {
    return { x: 0, y: 0 };
  }

  const strength = (influenceRadius - distance) / influenceRadius;
  return {
    x: (dx / distance) * maxPull * strength,
    y: (dy / distance) * maxPull * strength,
  };
}

/** Returns true when pointer-follower and magnetic effects should run. */
export function isMarketingCursorEffectsEnabled(
  prefersReducedMotion: boolean,
  coarsePointer: boolean
): boolean {
  return !prefersReducedMotion && !coarsePointer;
}

export const MARKETING_CURSOR_SECTION_SELECTOR = "[data-marketing-cursor-section]";
export const MARKETING_MAGNET_SELECTOR = "[data-magnet]";
