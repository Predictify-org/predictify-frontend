import type { ReactNode } from "react";

type ErrorVariant = "not-found" | "server" | "outage";

const ICONS: Record<ErrorVariant, ReactNode> = {
  // Broken/dashed link — navigation drift, not danger.
  "not-found": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M9 12h2m2 0h2M8.5 8.5 7 7a4 4 0 0 0-5.66 5.66l3 3M15.5 15.5 17 17a4 4 0 0 0 5.66-5.66l-3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
    </svg>
  ),
  // Wrench — StreamPay-owned, "we're fixing it".
  server: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.6l-6 6a1.5 1.5 0 1 0 2.1 2.1l6-6a3.5 3.5 0 0 0 4.6-4.6l-2 2-2.1-.6-.6-2.1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  // Orbit/constellation — external network, temporary.
  outage: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.6"
        transform="rotate(30 12 12)"
      />
      <circle cx="20" cy="8" r="1.2" fill="currentColor" />
    </svg>
  ),
};

type ErrorRecoveryProps = {
  variant: ErrorVariant;
  eyebrow: string;
  heading: string;
  body: string;
  helperNote: string;
  primaryAction: ReactNode;
  secondaryAction: ReactNode;
  /** Optional support reference (e.g. error digest) shown for follow-up. */
  reference?: string;
};

/**
 * Shared, presentational recovery layout for 404 / 5xx / Stellar-outage pages.
 * Follows design/error-pages-figma: skip link, brand header, one centered
 * recovery panel with icon, heading, body, actions, and a helper note.
 */
export function ErrorRecovery({
  variant,
  eyebrow,
  heading,
  body,
  helperNote,
  primaryAction,
  secondaryAction,
  reference,
}: ErrorRecoveryProps) {
  return (
    <div className={`error-page error-page--${variant}`}>
      <a className="error-page__skip" href="#error-recovery">
        Skip to StreamPay home
      </a>
      <header className="error-page__brand">
        <a className="error-page__brand-link" href="/">
          StreamPay
        </a>
      </header>
      <main className="error-page__main" id="error-recovery">
        <section
          className="error-page__panel"
          aria-labelledby="error-recovery-title"
        >
          <span className="error-page__icon" aria-hidden="true">
            {ICONS[variant]}
          </span>
          <p className="error-page__eyebrow">{eyebrow}</p>
          <h1 className="error-page__title" id="error-recovery-title">
            {heading}
          </h1>
          <p className="error-page__body">{body}</p>
          <div className="error-page__actions">
            {primaryAction}
            {secondaryAction}
          </div>
          <p className="error-page__note">{helperNote}</p>
          {reference ? (
            <p className="error-page__reference">
              Support reference: <code>{reference}</code>
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
