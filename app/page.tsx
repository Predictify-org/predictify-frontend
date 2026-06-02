import React from "react";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", gap: "1.5rem" }}>
      <div style={{ maxWidth: "48rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, letter-spacing: "0.08em", marginBottom: "0.75rem", textTransform: "uppercase" }}>
          Payment streaming on Stellar
        </p>
        <h1 style={{ fontSize: "2.75rem", lineHeight: 1.1, marginBottom: "1rem" }}>
          Manage payment streams with clear, consistent actions.
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
          Connect your wallet to start, pause, stop, settle, and withdraw from streams with confidence.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <a href="#connect-wallet" style={{ borderRadius: "999px", color: "rgb(3, 21, 10)", fontWeight: 700, padding: "0.875rem 1.25rem" }}>
          Connect Wallet
        </a>
        <a href="#stream-actions" style={{ borderRadius: "999px", fontWeight: 600, padding: "0.875rem 1.25rem" }}>
          View Stream Actions
        </a>
      </div>

      {/* Accessible Form Section requested by the test suite */}
      <form aria-label="Create a stream" onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: "1rem", maxWidth: "32rem", width: "100%" }}>
        <div>
          <label htmlFor="recipient">Recipient Address</label>
          <input id="recipient" type="text" placeholder="G..." style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div>
          <label htmlFor="amount">Amount</label>
          <input id="amount" type="number" style={{ width: "100%", padding: "0.5rem" }} />
        </div>
      </form>

      {/* Static Info Section */}
      <section aria-labelledby="stream-actions" id="stream-actions" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", maxWidth: "64rem", width: "100%" }}>
        <article style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Start</h2>
          <p style={{ lineHeight: 1.5 }}>Start a new payment stream.</p>
        </article>
        <article style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Pause</h2>
          <p style={{ lineHeight: 1.5 }}>Pause an active payment stream.</p>
        </article>
        <article style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Stop</h2>
          <p style={{ lineHeight: 1.5 }}>Stop a stream that should not continue.</p>
        </article>
        <article style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Settle</h2>
          <p style={{ lineHeight: 1.5 }}>Settle the outstanding balance for a stream.</p>
        </article>
        <article style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Withdraw</h2>
          <p style={{ lineHeight: 1.5 }}>Withdraw available funds from a settled stream.</p>
        </article>
      </section>

      {/* Accessible Region Landmark requested by the test suite */}
      <section aria-label="Active streams" style={{ display: "grid", gap: "1rem", maxWidth: "64rem", width: "100%" }}>
        <h2 id="active-streams-heading" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Active Streams</h2>
        <ul role="list" style={{ display: "grid", gap: "1rem", listStyle: "none" }}>
          <li role="listitem" className="stream-row">Stream Element 1</li>
          <li role="listitem" className="stream-row">Stream Element 2</li>
          <li role="listitem" className="stream-row">Stream Element 3</li>
        </ul>
      </section>

      {/* Status Badges Preview Section */}
      <section aria-labelledby="stream-statuses" style={{ display: "grid", gap: "1rem", maxWidth: "64rem", width: "100%" }}>
        <div>
          <h2 id="stream-statuses" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Stream statuses</h2>
          <p style={{ lineHeight: 1.5 }}>Reusable badges keep stream lifecycle labels readable.</p>
        </div>
        <div style={{ borderRadius: "1rem", padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>List preview</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <span aria-label="Stream status: Draft" className="status-badge status-badge--draft">Draft</span>
            <span aria-label="Stream status: Active" className="status-badge status-badge--active">Active</span>
            <span aria-label="Stream status: Paused" className="status-badge status-badge--paused">Paused</span>
            <span aria-label="Stream status: Ended" className="status-badge status-badge--ended">Ended</span>
          </div>
        </div>
      </section>
    </main>
  );
}
