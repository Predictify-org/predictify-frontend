"use client";

import React, { useState } from "react";
import { RecipientList, type Recipient } from "./components/RecipientList";

export default function MultiRecipientStreamPage() {
  const [streamName, setStreamName] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(1000);
  const [token, setToken] = useState("XLM");
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: crypto.randomUUID(), address: "", percentage: 100, amount: 1000 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call for creation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setSuccess(true);
  };

  const totalAllocated = recipients.reduce((sum, r) => sum + r.percentage, 0);
  const isValid = totalAllocated === 100 && streamName.trim().length > 0;

  if (success) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="page-hero__eyebrow">Success</p>
            <h1 className="page-hero__title">Stream Created Successfully</h1>
            <p className="page-hero__description">Your multi-recipient stream has been configured and is ready.</p>
          </div>
          <button className="button button--primary" onClick={() => window.location.href = '/streams'}>
            View All Streams
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">New Stream</p>
          <h1 className="page-hero__title">Create Multi-Recipient Stream</h1>
          <p className="page-hero__description">
            Fan out payments to multiple contributors or vendors simultaneously.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.5rem", color: "var(--muted-light)" }}>
                Stream Name
              </label>
              <input
                type="text"
                required
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                placeholder="e.g. GrantFox Q3 Distribution"
                style={{
                  width: "100%",
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-base)"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.5rem", color: "var(--muted-light)" }}>
                  Total Amount
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => {
                    const newTotal = Number(e.target.value);
                    setTotalAmount(newTotal);
                    // Update amounts based on existing percentages
                    setRecipients(recipients.map(r => ({
                      ...r,
                      amount: Number(((r.percentage / 100) * newTotal).toFixed(4))
                    })));
                  }}
                  style={{
                    width: "100%",
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-base)"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.5rem", color: "var(--muted-light)" }}>
                  Token
                </label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-base)"
                  }}
                >
                  <option value="XLM">XLM</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>
          </div>

          <RecipientList
            totalAmount={totalAmount}
            recipients={recipients}
            onChange={setRecipients}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <button 
              type="button" 
              className="button button--secondary"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`button button--primary ${isSubmitting ? "button--busy" : ""}`}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Stream"}
            </button>
          </div>

        </form>
      </section>
    </main>
  );
}
