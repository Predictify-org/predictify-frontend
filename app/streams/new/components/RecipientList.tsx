"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../../../components/Card";
import { CopyAddress } from "../../../components/CopyAddress";

export interface Recipient {
  id: string;
  address: string;
  percentage: number;
  amount: number;
}

interface RecipientListProps {
  totalAmount: number;
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
}

type SplitPreset = "equal" | "custom";

export function RecipientList({ totalAmount, recipients, onChange }: RecipientListProps) {
  const [preset, setPreset] = useState<SplitPreset>("equal");

  // Re-calculate equal splits when preset is 'equal' and totalAmount/recipients length changes
  useEffect(() => {
    if (preset === "equal" && recipients.length > 0) {
      const splitPercentage = Number((100 / recipients.length).toFixed(4));
      const splitAmount = Number((totalAmount / recipients.length).toFixed(4));

      const updated = recipients.map((r, i) => {
        // Adjust the last one to ensure it adds up exactly to 100% / totalAmount if there are rounding errors
        if (i === recipients.length - 1) {
          const usedPercentage = splitPercentage * (recipients.length - 1);
          const usedAmount = splitAmount * (recipients.length - 1);
          return {
            ...r,
            percentage: Number((100 - usedPercentage).toFixed(4)),
            amount: Number((totalAmount - usedAmount).toFixed(4)),
          };
        }
        return {
          ...r,
          percentage: splitPercentage,
          amount: splitAmount,
        };
      });

      // Avoid infinite loops by checking if actually changed
      const isDifferent = updated.some((u, i) => u.percentage !== recipients[i].percentage);
      if (isDifferent) {
        onChange(updated);
      }
    }
  }, [preset, recipients.length, totalAmount, onChange, recipients]);

  const handleAddRecipient = () => {
    const newRecipient: Recipient = {
      id: crypto.randomUUID(),
      address: "",
      percentage: 0,
      amount: 0,
    };
    onChange([...recipients, newRecipient]);
  };

  const handleRemoveRecipient = (id: string) => {
    onChange(recipients.filter((r) => r.id !== id));
  };

  const handleAddressChange = (id: string, address: string) => {
    onChange(
      recipients.map((r) => (r.id === id ? { ...r, address } : r))
    );
  };

  const handlePercentageChange = (id: string, percentageStr: string) => {
    setPreset("custom"); // Switch to custom if they manually edit
    const percentage = Number(percentageStr) || 0;
    const amount = Number(((percentage / 100) * totalAmount).toFixed(4));
    onChange(
      recipients.map((r) =>
        r.id === id ? { ...r, percentage, amount } : r
      )
    );
  };

  const totalPercentage = recipients.reduce((sum, r) => sum + r.percentage, 0);

  return (
    <Card padding="lg" className="recipient-list-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-semibold)", margin: 0 }}>Recipients</h2>
        
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>Split:</span>
          <select 
            value={preset} 
            onChange={(e) => setPreset(e.target.value as SplitPreset)}
            style={{
              background: "var(--panel-elevated)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              padding: "0.25rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)"
            }}
          >
            <option value="equal">Equal Split</option>
            <option value="custom">Custom Split</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {recipients.map((recipient, index) => (
          <div 
            key={recipient.id} 
            style={{ 
              display: "flex", 
              gap: "1rem", 
              alignItems: "flex-start",
              padding: "1rem",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)"
            }}
          >
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.25rem", color: "var(--muted-light)" }}>
                Recipient Address / Email
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="GABC... or email@example.com"
                  value={recipient.address}
                  onChange={(e) => handleAddressChange(recipient.id, e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-base)"
                  }}
                />
                {recipient.address && !recipient.address.includes("@") && (
                  <CopyAddress value={recipient.address} showCopyButton={true} />
                )}
              </div>
            </div>

            <div style={{ width: "120px" }}>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.25rem", color: "var(--muted-light)" }}>
                Share (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={recipient.percentage}
                onChange={(e) => handlePercentageChange(recipient.id, e.target.value)}
                disabled={preset === "equal"}
                style={{
                  width: "100%",
                  background: preset === "equal" ? "var(--panel-elevated)" : "var(--background)",
                  border: "1px solid var(--border)",
                  color: preset === "equal" ? "var(--muted-foreground)" : "var(--foreground)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-base)"
                }}
              />
            </div>

            <div style={{ width: "120px" }}>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "0.25rem", color: "var(--muted-light)" }}>
                Amount
              </label>
              <div style={{
                padding: "0.5rem 0",
                fontSize: "var(--text-base)",
                color: "var(--foreground)",
                display: "flex",
                alignItems: "center",
                height: "42px" // match input height roughly
              }}>
                {recipient.amount}
              </div>
            </div>

            {recipients.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveRecipient(recipient.id)}
                style={{
                  marginTop: "1.5rem",
                  background: "transparent",
                  border: "none",
                  color: "var(--error)",
                  cursor: "pointer",
                  padding: "0.5rem",
                  fontSize: "var(--text-sm)"
                }}
                aria-label="Remove recipient"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          type="button" 
          onClick={handleAddRecipient}
          className="button button--secondary"
          style={{ fontSize: "var(--text-sm)", padding: "0.5rem 1rem" }}
        >
          + Add Recipient
        </button>

        <div style={{ 
          fontSize: "var(--text-sm)", 
          color: totalPercentage > 100 ? "var(--error)" : (totalPercentage === 100 ? "var(--success)" : "var(--warning)")
        }}>
          Total Allocated: {totalPercentage.toFixed(2)}%
        </div>
      </div>
    </Card>
  );
}
