"use client";

import { useState } from "react";
import { StatusBadge, type StreamStatus } from "./StatusBadge";
import { fetchWithIdempotency } from "../../lib/apiClient";

export type StreamRowData = {
  id: string;
  nextAction: string;
  rate: string;
  recipient: string;
  schedule: string;
  status: StreamStatus;
};

type StreamRowProps = {
  stream: StreamRowData;
};

export function StreamRow({ stream }: StreamRowProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isIncidentMode = process.env.NEXT_PUBLIC_DISABLE_ONCHAIN_OPERATIONS === "true";

  const handleAction = async () => {
    if (isIncidentMode) {
      setErrorMsg("On-chain operations are temporarily paused during incident mode.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const actionRoute = stream.nextAction.toLowerCase();
      
      await fetchWithIdempotency(`/api/streams/${stream.id}/${actionRoute}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionRoute,
        }),
      });

      alert(`${stream.nextAction} successful for ${stream.recipient}!`);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <article className="stream-row" aria-labelledby={`${stream.id}-recipient`}>
      <div className="stream-row__primary">
        <div>
          <h2 className="stream-row__recipient" id={`${stream.id}-recipient`}>
            {stream.recipient}
          </h2>
          <p className="stream-row__schedule">{stream.schedule}</p>
        </div>
        <StatusBadge status={stream.status} />
      </div>

      <dl className="stream-row__meta">
        <div>
          <dt>Rate</dt>
          <dd>{stream.rate}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{stream.status}</dd>
        </div>
      </dl>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
        <button 
          className="button button--secondary stream-row__action" 
          type="button"
          onClick={handleAction}
          disabled={isProcessing || isIncidentMode}
        >
          {isProcessing ? "Processing..." : stream.nextAction}
        </button>
        {isIncidentMode && (
          <span style={{ color: "orange", fontSize: "0.75rem", maxWidth: "200px", textAlign: "right" }}>
            On-chain operations are paused.
          </span>
        )}
        {errorMsg && (
          <span style={{ color: "red", fontSize: "0.75rem", maxWidth: "200px", textAlign: "right" }}>
            {errorMsg}
          </span>
        )}
      </div>
    </article>
  );
}