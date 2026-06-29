const statusBadgeCopy = {
  active: "Active",
  draft: "Draft",
  ended: "Ended",
  paused: "Paused",
} as const;

export type StreamStatus = keyof typeof statusBadgeCopy;

/**
 * Distinct glyph per status so the state is conveyed by **shape as well as
 * colour**. This keeps the badge legible for users with colour-vision
 * deficiency and passes colour-blind simulator checks (the shapes remain
 * distinguishable under protanopia/deuteranopia/tritanopia).
 *
 * - active  → ▶ play (flowing)
 * - paused  → ‖ two bars (paused)
 * - ended   → ■ filled square (stopped)
 * - draft   → ○ hollow circle (not started)
 */
const statusBadgeGlyph: Record<StreamStatus, string> = {
  active: "▶",
  paused: "‖",
  ended: "■",
  draft: "○",
};

type StatusBadgeProps = {
  status: StreamStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = statusBadgeCopy[status];

  return (
    <span
      aria-label={`Stream status: ${label}`}
      className={`status-badge status-badge--${status}`}
    >
      {/* Decorative shape icon — the text label already conveys the status to
          assistive tech, so the glyph is hidden from screen readers. */}
      <span className={`status-icon status-icon--${status}`} aria-hidden="true">
        {statusBadgeGlyph[status]}
      </span>
      {label}
    </span>
  );
}
