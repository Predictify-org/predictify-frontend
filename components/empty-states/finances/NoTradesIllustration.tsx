/**
 * NoTradesIllustration
 *
 * Decorative SVG illustration for the empty "trades / transactions" state on
 * /finances. The candlestick chart motif ties visually to prediction markets.
 *
 * Accessibility: aria-hidden="true" — surrounding text provides full context.
 */
export function NoTradesIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chart baseline */}
      <line
        x1="30"
        y1="130"
        x2="210"
        y2="130"
        className="stroke-border"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Y-axis */}
      <line
        x1="30"
        y1="30"
        x2="30"
        y2="130"
        className="stroke-border"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Candlestick 1 — faded */}
      <line x1="70" y1="55" x2="70" y2="115" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="63" y="70" width="14" height="30" rx="2" className="fill-muted-foreground/15 stroke-muted-foreground/20" strokeWidth="1" />

      {/* Candlestick 2 — faded */}
      <line x1="110" y1="50" x2="110" y2="110" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="103" y="65" width="14" height="28" rx="2" className="fill-muted-foreground/15 stroke-muted-foreground/20" strokeWidth="1" />

      {/* Candlestick 3 — faded */}
      <line x1="150" y1="60" x2="150" y2="120" className="stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="143" y="78" width="14" height="26" rx="2" className="fill-muted-foreground/15 stroke-muted-foreground/20" strokeWidth="1" />

      {/* Candlestick 4 — ghost (missing) */}
      <line x1="190" y1="55" x2="190" y2="118" className="stroke-muted-foreground/10" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect
        x="183"
        y="72"
        width="14"
        height="28"
        rx="2"
        className="stroke-muted-foreground/15"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      {/* Magnifying glass overlay */}
      <circle cx="165" cy="52" r="18" className="fill-background stroke-border" strokeWidth="2" />
      <circle cx="163" cy="50" r="9" className="stroke-muted-foreground/40" strokeWidth="1.5" />
      <line x1="169" y1="57" x2="175" y2="63" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
      {/* Question mark inside lens */}
      <text x="159" y="54" fontSize="9" className="fill-muted-foreground/50" fontFamily="system-ui">?</text>
    </svg>
  );
}
