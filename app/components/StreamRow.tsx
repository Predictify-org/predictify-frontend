"use client";

import { useState } from "react";
import { StatusBadge, type StreamStatus } from "./StatusBadge";
import { StreamProgress } from "./StreamProgress";
import { ErrorToast } from "./ErrorToast";
import { fetchWithIdempotency } from "../../lib/apiClient";
import { isStreamPayError, formatErrorForDisplay } from "../lib/errors";
import type { StreamPayError } from "../lib/errors";

export type StreamRowData = {
  id: string;
  nextAction: string;
  rate: string;
  recipient: string;
  schedule: string;
  status: StreamStatus;
  /** Amount already accrued (display units). Used by StreamProgress. */
  accruedAmount?: number;
  /** Total stream amount (display units). Used by StreamProgress. */
  totalAmount?: number;
  /** ISO-8601 stream start timestamp. Used by StreamProgress fallback. */
  startedAt?: string;
  /** ISO-8601 expected end timestamp. Used by StreamProgress fallback. */
  endsAt?: string;
};

type StreamRowProps = {
  stream: StreamRowData;
};

export function StreamRow({ stream }: StreamRowProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<StreamPayError | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isIncidentMode = process.env.NEXT_PUBLIC_DISABLE_ONCHAIN_OPERATIONS === "true";

  const handleDismissError = () => {
    setError(null);
  };

  const handleRetry = async () => {
    if (!error?.retry.retryable) return;
    handleDismissError();
    await handleAction();
  };

  const handleAction = async () => {
    if (isIncidentMode) {
      setErrorMsg("On-chain operations are temporarily paused during incident mode.");
      return;
    }

    setIsProcessing(true);
    setError(null);

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
    } catch (err: unknown) {
      // Normalize error to StreamPayError format
      const normalizedError = isStreamPayError(err) 
        ? err 
        : formatErrorForDisplay(err as StreamPayError);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Stream action failed:', err);
      }
      
      setError(isStreamPayError(err) ? err : null);
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
          <dd className={stream.status === "active" ? "stream-row__accrued--animated" : ""}>
            {stream.rate}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{stream.status}</dd>
        </div>
      </dl>

      {/* Burn-down progress bar — only rendered for non-draft streams */}
      {stream.status !== "draft" && (
        <StreamProgress
          status={stream.status}
          accruedAmount={stream.accruedAmount}
          totalAmount={stream.totalAmount}
          startedAt={stream.startedAt}
          endsAt={stream.endsAt}
          className="stream-row__progress"
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
        <button
          className="button button--secondary stream-row__action"
          type="button"
          onClick={handleAction}
          disabled={isProcessing || isIncidentMode}
        >
          {isProcessing ? "Processing..." : stream.nextAction}
        </button>
      </div>
      
      {error && (
        <ErrorToast
          error={error}
          onDismiss={handleDismissError}
          onRetry={error.retry.retryable ? handleRetry : undefined}
          autoDismiss={!error.retry.retryable}
          autoDismissDelayMs={5000}
        />
      )}
    </article>
  );
}