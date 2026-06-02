"use client";

import { useState, useEffect } from "react";
import { StatusBadge, type StreamStatus } from "./components/StatusBadge";
import { StreamPrimer } from "./components/StreamPrimer";
import { homeCopy, streamActionCopy } from "./content/copy";

const ONBOARDING_KEY = "streampay_onboarding_dismissed";

export default function Home() {
  const actions = Object.values(streamActionCopy);
  const streamStatuses: StreamStatus[] = ["draft", "active", "paused", "ended"];

  const [onboardingVisible, setOnboardingVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY);
    if (!dismissed) {
      setOnboardingVisible(true);
    }
  }, []);

  const handleDismissOnboarding = () => {
    setOnboardingVisible(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  const handleShowOnboarding = (e: React.MouseEvent) => {
    e.preventDefault();
    setOnboardingVisible(true);
  };

  return (
    <main className="home">
      <div className="home__intro">
        <p className="home__eyebrow">{homeCopy.eyebrow}</p>
        <h1 className="home__title">{homeCopy.heading}</h1>
        <p className="home__lead">{homeCopy.body}</p>
      </div>

      <div className="home__cta-row">
        <a href="#connect-wallet" className="button button--primary">
          {homeCopy.primaryCta}
        </a>
        <a href="#stream-actions" className="button button--secondary">
          {homeCopy.secondaryCta}
        </button>
      </div>

      <section
        aria-labelledby="stream-actions"
        id="stream-actions"
        className="home__section home__grid"
      >
        {actions.map((action) => (
          <article key={action.label} className="home__card">
            <h2 className="home__card-title">{action.label}</h2>
            <p className="home__text">{action.description}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="stream-statuses" className="home__section">
        <div>
          <h2 id="stream-statuses" className="home__section-title">
            Stream statuses
          </h2>
          <p className="home__text">
            Reusable badges keep stream lifecycle labels readable in both list and detail views.
          </p>
        </div>

        <div className="home__card">
          <h3 className="home__subtitle">List preview</h3>
          <div className="home__badge-row">
            {streamStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>

        <article className="home__card home__card--stack">
          <div className="home__card-head">
            <div>
              <h3 className="home__card-subtitle">Design Retainer Stream</h3>
              <p className="home__text">
                Example detail card showing the same badge in context.
              </p>
            </div>
            <StatusBadge status="active" />
          </div>
        </article>
      </section>
    </main>
  );
}
