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
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      {onboardingVisible && <StreamPrimer onClose={handleDismissOnboarding} />}

      <div style={{ maxWidth: "48rem", textAlign: "center" }}>
        <p
          style={{
            color: "var(--accent)",
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            marginBottom: "0.75rem",
            textTransform: "uppercase",
          }}
        >
          {homeCopy.eyebrow}
        </p>
        <h1 style={{ fontSize: "2.75rem", lineHeight: 1.1, marginBottom: "1rem" }}>
          {homeCopy.heading}
        </h1>
        <p style={{ color: "var(--muted-light)", fontSize: "1.05rem", lineHeight: 1.6 }}>
          {homeCopy.body}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href="#connect-wallet"
          style={{
            background: "var(--accent)",
            borderRadius: "999px",
            color: "#03150a",
            fontWeight: 700,
            padding: "0.875rem 1.25rem",
          }}
        >
          {homeCopy.primaryCta}
        </a>
        <button
          onClick={handleShowOnboarding}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            color: "var(--foreground)",
            fontWeight: 600,
            padding: "0.875rem 1.25rem",
            cursor: "pointer",
          }}
        >
          {homeCopy.secondaryCta}
        </button>
      </div>

      <section
        aria-labelledby="stream-actions"
        id="stream-actions"
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          maxWidth: "64rem",
          width: "100%",
        }}
      >
        {actions.map((action) => (
          <article
            key={action.label}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{action.label}</h2>
            <p style={{ color: "var(--muted-light)", lineHeight: 1.5 }}>{action.description}</p>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="stream-statuses"
        style={{ display: "grid", gap: "1rem", maxWidth: "64rem", width: "100%" }}
      >
        <div>
          <h2 id="stream-statuses" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Stream statuses
          </h2>
          <p style={{ color: "var(--muted-light)", lineHeight: 1.5 }}>
            Reusable badges keep stream lifecycle labels readable in both list and detail views.
          </p>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>List preview</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {streamStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>

        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            display: "grid",
            gap: "0.75rem",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Design Retainer Stream</h3>
              <p style={{ color: "var(--muted-light)", lineHeight: 1.5 }}>
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
