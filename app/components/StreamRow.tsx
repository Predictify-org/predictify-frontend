"use client";

import { useState, useRef } from "react";
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
  const [isIncidentMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // Local notification state for polite screen reader announcements (#219)
  const [srAnnouncement, setSrAnnouncement] = useState("");

  // Ref hook to preserve active keyboard focus target parameters across button re-renders
  const actionButtonRef = useRef<HTMLButtonElement>(null);

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
    setSrAnnouncement(""); // Reset prior announcements

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

      // Clear layout alerts and assign semantic live region announcement string values
      const successMessage = `${stream.nextAction} operation completed successfully for ${stream.recipient}.`;
      setSrAnnouncement(successMessage);

      // Preserve active interactive element focus ring natively within the DOM tree
      setTimeout(() => {
        actionButtonRef.current?.focus();
      }, 0);

    } catch (err: unknown) {
      const normalizedError = isStreamPayError(err) 
        ? err 
        : formatErrorForDisplay(err as StreamPayError);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Stream action failed:', err);
      }
      
      setError(isStreamPayError(err) ? err : null);
      setSrAnnouncement(`Stream action failed: ${normalizedError.message || "Unknown error occurred"}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <article className="stream-row" aria-labelledby={`${stream.id}-recipient`}>
      {/* Dynamic polite status messenger announcement node layer for assistive tech */}
      <div className="sr-only" aria-live="polite" role="status">
        {srAnnouncement}
      </div>

      <div className="stream-row__primary">
        <div>
          <h2 className="stream-row__recipient" id={`${stream.id}-recipient`}>
            {stream.recipient}
          </h2>
          <p className="stream-row__schedule">{stream.schedule}</p>
        </div>
        <StatusBadge status={stream.status} />
      </div>

      <div className="stream-row__meta">
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
      </div>

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
          ref={actionButtonRef}
          className={`button button--secondary stream-row__action ${isProcessing ? "button--busy" : ""}`}
          type="button"
          onClick={handleAction}
          disabled={isProcessing || isIncidentMode}
          aria-busy={isProcessing}
          aria-live="assertive"
        >
          {isProcessing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Processing...</span>
            </>
          ) : (
            <span>{stream.nextAction}</span>
          )}
        </button>
        {errorMsg && <p className="detail-incident-warning" role="alert">{errorMsg}</p>}
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