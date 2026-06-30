type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  /** Optional first-time guidance steps to display below the description. */
  guidanceSteps?: string[];
};

export function EmptyState({ eyebrow, title, description, actionLabel, onAction, guidanceSteps }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <p className="empty-state__eyebrow">{eyebrow}</p>
      <h2 className="empty-state__title" id="empty-state-title">
        {title}
      </h2>
      <p className="empty-state__description">{description}</p>
      {guidanceSteps && guidanceSteps.length > 0 && (
        <ol className="empty-state__guidance" aria-label="Getting started steps">
          {guidanceSteps.map((step, i) => (
            <li key={i} className="empty-state__guidance-step">
              {step}
            </li>
          ))}
        </ol>
      )}
      <button className="button button--primary" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </section>
  );
}
