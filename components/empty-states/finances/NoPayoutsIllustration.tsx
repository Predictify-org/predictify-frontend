/**
 * NoPayoutsIllustration
 *
 * Decorative SVG illustration for the empty "fee distribution / payouts" state
 * on /finances. A donut chart outline with an empty centre signals no
 * distributed fees yet.
 *
 * Accessibility: aria-hidden="true" — surrounding text provides full context.
 */
export function NoPayoutsIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer donut ring — dashed to signal "nothing here" */}
      <circle
        cx="120"
        cy="80"
        r="52"
        className="stroke-muted-foreground/20"
        strokeWidth="18"
        strokeDasharray="6 4"
      />
      {/* Inner cutout (white/bg fill gives donut shape without clip-path) */}
      <circle cx="120" cy="80" r="34" className="fill-background" />

      {/* Centre label — currency sign, greyed out */}
      <text
        x="120"
        y="87"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        className="fill-muted-foreground/25"
        fontFamily="system-ui"
      >
        $
      </text>

      {/* Three "slice" stubs that hint at categories but are empty */}
      <line x1="120" y1="28" x2="120" y2="38" className="stroke-muted-foreground/15" strokeWidth="2" strokeLinecap="round" />
      <line x1="165" y1="107" x2="158" y2="100" className="stroke-muted-foreground/15" strokeWidth="2" strokeLinecap="round" />
      <line x1="75" y1="107" x2="82" y2="100" className="stroke-muted-foreground/15" strokeWidth="2" strokeLinecap="round" />

      {/* Label dots at chart perimeter */}
      <circle cx="120" cy="24" r="3" className="fill-muted-foreground/20" />
      <circle cx="168" cy="112" r="3" className="fill-muted-foreground/20" />
      <circle cx="72" cy="112" r="3" className="fill-muted-foreground/20" />

      {/* Tiny legend rows — greyed out placeholders */}
      <rect x="30" y="142" width="40" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="78" y="142" width="30" height="6" rx="3" className="fill-muted-foreground/10" />
      <rect x="116" y="142" width="50" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="174" y="142" width="36" height="6" rx="3" className="fill-muted-foreground/10" />
    </svg>
  );
}
