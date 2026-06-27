import Link from "next/link";

const STEPS = [
  {
    id: "fund",
    title: "Fund the stream",
    description:
      "Choose a recipient, set the cadence, and keep enough balance available for the schedule you want to run.",
  },
  {
    id: "stream",
    title: "Payments flow automatically",
    description:
      "Once live, the stream accrues over time so both sides can track progress without chasing manual payouts.",
  },
  {
    id: "withdraw",
    title: "Settle and withdraw with confidence",
    description:
      "When funds are ready, StreamPay shows the current state, exact timestamps, and the next safe action to take.",
  },
] as const;

export function Explainer() {
  return (
    <section aria-labelledby="explainer-title" className="explainer">
      <div className="explainer__intro">
        <p className="explainer__eyebrow">How Streaming Works</p>
        <h2 className="explainer__title" id="explainer-title">
          Three steps from setup to payout clarity.
        </h2>
        <p className="explainer__description">
          This onboarding panel gives new GrantFox users a quick mental model before they create their first stream.
        </p>
      </div>

      <div className="explainer__grid">
        {STEPS.map((step, index) => (
          <article className="explainer-card" key={step.id}>
            <div className={`explainer-card__art explainer-card__art--${step.id}`} aria-hidden="true">
              <span className="explainer-card__step">{index + 1}</span>
              <span className="explainer-card__pulse" />
            </div>
            <div className="explainer-card__content">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="explainer__cta-row">
        <Link className="button button--primary" href="/streams">
          View streams
        </Link>
        <Link className="button button--secondary" href="/settings/notifications">
          Review notifications
        </Link>
      </div>
    </section>
  );
}
