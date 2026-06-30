/**
 * NoDepositsIllustration
 *
 * Decorative SVG illustration for the empty "deposits" state on /finances.
 * Exported at a 2× logical size (240×160 viewBox) so it renders crisp on
 * high-DPI screens without extra image assets.
 *
 * Accessibility: aria-hidden="true" — the surrounding empty-state component
 * provides all necessary text context.
 */
export function NoDepositsIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wallet body */}
      <rect
        x="40"
        y="50"
        width="160"
        height="90"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      {/* Wallet flap */}
      <rect
        x="40"
        y="40"
        width="160"
        height="30"
        rx="8"
        className="fill-muted/60 stroke-border"
        strokeWidth="2"
      />
      {/* Card slot */}
      <rect
        x="130"
        y="75"
        width="55"
        height="36"
        rx="6"
        className="fill-background stroke-border"
        strokeWidth="1.5"
      />
      {/* Coin stack — left */}
      <ellipse cx="80" cy="118" rx="18" ry="6" className="fill-muted-foreground/20" />
      <rect x="62" y="100" width="36" height="18" rx="4" className="fill-muted-foreground/20" />
      <ellipse cx="80" cy="100" rx="18" ry="6" className="fill-muted-foreground/30" />
      {/* Down-arrow indicating "no incoming" */}
      <path
        d="M120 22 L120 38 M113 31 L120 38 L127 31"
        className="stroke-muted-foreground/40"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dashed circle suggesting missing funds */}
      <circle
        cx="120"
        cy="95"
        r="14"
        className="stroke-muted-foreground/25"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <path
        d="M115 95 h10 M120 90 v10"
        className="stroke-muted-foreground/30"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
