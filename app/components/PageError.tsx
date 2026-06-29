type PageErrorProps = {
  /** Short heading describing the failure. */
  heading: string;
  /** Friendly explanation; avoid technical jargon. */
  message: string;
  /** Called when the user presses the primary action. Omit to hide the button. */
  onRetry?: () => void;
  /** Override the retry button label. */
  retryLabel?: string;
  /** Destination for the "Contact support" secondary link. */
  supportHref?: string;
};

/**
 * Inline error panel displayed within the page body (not a full-page overlay).
 *
 * Uses role="alert" so screen readers announce the error immediately when it
 * appears, without requiring the user to navigate to it.
 */
export function PageError({
  heading,
  message,
  onRetry,
  retryLabel = "Try again",
  supportHref = "/settings",
}: PageErrorProps) {
  return (
    <section
      aria-labelledby="page-error-heading"
      aria-live="assertive"
      className="page-error"
      data-testid="page-error"
      role="alert"
    >
      <span aria-hidden="true" className="page-error__icon">
        <svg fill="none" focusable="false" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 8v5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="15.5" fill="currentColor" r="0.75" />
        </svg>
      </span>

      <p className="page-error__eyebrow">Error</p>

      <h2 className="page-error__heading" id="page-error-heading">
        {heading}
      </h2>

      <p className="page-error__message">{message}</p>

      <div className="page-error__actions">
        {onRetry && (
          <button className="button button--primary" onClick={onRetry} type="button">
            {retryLabel}
          </button>
        )}
        <a className="button button--secondary" href={supportHref}>
          Contact support
        </a>
      </div>
    </section>
  );
}
