import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline – Predictify",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "4rem" }} aria-hidden="true">
        📡
      </span>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
        You're offline
      </h1>
      <p style={{ color: "var(--muted-foreground, #888)", maxWidth: "360px", margin: 0 }}>
        It looks like you've lost your internet connection. Your last-viewed
        market list may still be available below — reconnect to see live
        predictions.
      </p>
      <a
        href="/markets"
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.4rem",
          borderRadius: "8px",
          background: "var(--primary, #6366f1)",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Try again
      </a>
    </main>
  );
}
