"use client";

import { useState } from "react";
import Link from "next/link";
import type { Stream, StreamStatus } from "../../types/openapi";
import { StatusBadge } from "../../components/StatusBadge";
import { NetworkBadge } from "../../components/NetworkBadge";
import { PaymentTimeline } from "../../components/PaymentTimeline";
import { ErrorToast } from "../../components/ErrorToast";
import { ConfirmCancel } from "../../components/ConfirmCancel";
import { Timestamp } from "../../components/Timestamp";
import { fetchWithIdempotency } from "../../../lib/apiClient";
import { isStreamPayError, normalizeError } from "../../lib/errors";
import type { StreamPayError } from "../../lib/errors";

type StreamDetailClientProps = {
  stream: Stream;
  network?: "testnet" | "mainnet";
};

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      aria-label="Copy to clipboard"
      className="receipt-copy-btn no-print"
      onClick={handleCopy}
      type="button"
      style={{ marginLeft: "0.5rem" }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StellarAddress({ address }: { address: string }) {
  return (
    <span className="receipt-address-wrap">
      <span aria-hidden="true" className="no-print">
        {truncateAddress(address)}
      </span>
      <span className="print-only">{address}</span>
      <CopyButton value={address} />
    </span>
  );
}

function TxHash({ hash }: { hash: string }) {
  return (
    <span className="receipt-address-wrap">
      <span aria-hidden="true" className="no-print">
        {truncateAddress(hash, 8)}
      </span>
      <span className="print-only">{hash}</span>
      <CopyButton value={hash} />
    </span>
  );
}

const ACTION_MAP: Record<string, string> = {
  draft: "Start",
  active: "Pause",
  paused: "Resume",
  ended: "Withdraw",
  withdrawn: "Settled",
};

const STREAM_ACTION_SUMMARY: Record<
  string,
  {
    amountLabel: string;
    destructiveAction?: "cancel" | "withdraw";
    requiresTypedAmount?: boolean;
  }
> = {
  "stream-ada": {
    amountLabel: "120 XLM",
    destructiveAction: "cancel",
    requiresTypedAmount: true,
  },
  "stream-kemi": {
    amountLabel: "32 XLM",
    destructiveAction: "cancel",
    requiresTypedAmount: false,
  },
  "stream-yusuf": {
    amountLabel: "18 XLM",
    destructiveAction: "withdraw",
    requiresTypedAmount: false,
  },
};

export function StreamDetailClient({ stream, network = "testnet" }: StreamDetailClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDestructiveOpen, setIsDestructiveOpen] = useState(false);
  const [error, setError] = useState<StreamPayError | null>(null);

  const isIncidentMode = process.env.NEXT_PUBLIC_DISABLE_ONCHAIN_OPERATIONS === "true";
  const nextAction = ACTION_MAP[stream.status] || "Action";
  const actionSummary = STREAM_ACTION_SUMMARY[stream.id] ?? {
    amountLabel: stream.rate,
    destructiveAction: stream.status === "ended" ? "withdraw" : "cancel",
    requiresTypedAmount: false,
  };

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
      alert("On-chain operations are temporarily paused during incident mode.");
      return;
    }

    if (stream.status === "withdrawn") {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const actionRoute = nextAction.toLowerCase();
      
      await fetchWithIdempotency(`/api/streams/${stream.id}/${actionRoute}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionRoute,
        }),
      });

      alert(`${nextAction} successful for stream ${stream.id}!`);
    } catch (err: unknown) {
      const normalizedError = isStreamPayError(err) 
        ? err 
        : normalizeError(err);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Stream action failed:', err);
      }
      
      setError(normalizedError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDestructiveAction = async () => {
    const actionRoute = actionSummary.destructiveAction;
    if (!actionRoute || isIncidentMode) return;

    setIsProcessing(true);
    setError(null);

    try {
      await fetchWithIdempotency(`/api/streams/${stream.id}/${actionRoute}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionRoute,
          amount: actionSummary.amountLabel,
        }),
      });

      alert(`${actionRoute === "cancel" ? "Cancel" : "Withdraw"} successful for stream ${stream.id}!`);
    } catch (err: unknown) {
      const normalizedError = isStreamPayError(err)
        ? err
        : normalizeError(err);

      setError(normalizedError);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="page-shell">
      {/* Back to Streams navigation */}
      <nav aria-label="Breadcrumb" className="no-print">
        <Link href="/streams" className="detail-back-link">
          ← Back to Streams
        </Link>
      </nav>

      {/* Hero section */}
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">Stream Detail</p>
          <div className="detail-header-row">
            <h1 className="page-hero__title detail-title">
              {stream.label || "Payment Stream"}
            </h1>
            <div className="detail-badges-wrap">
              <StatusBadge status={(stream.status === "withdrawn" ? "ended" : stream.status) as any} />
              <NetworkBadge showLabel={true} />
            </div>
          </div>
          <p className="page-hero__description">
            Monitor real-time progress, dynamic next actions, and full vertical payment timeline records.
          </p>
        </div>
      </section>

      {/* Main Grid Layout */}
      <div className="detail-grid">
        {/* Left Column: Stream Details & Next-Action Panel */}
        <div className="detail-left-col">
          {/* Summary Card */}
          <section className="detail-card" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="detail-card__heading">Stream Summary</h2>
            <div className="receipt-divider" style={{ margin: "0.75rem 0" }} />
            <dl className="detail-kv">
              <div>
                <dt>Stream ID</dt>
                <dd><code className="receipt-mono">{stream.id}</code></dd>
              </div>
              {stream.email && (
                <div>
                  <dt>Recipient Email</dt>
                  <dd>{stream.email}</dd>
                </div>
              )}
              <div>
                <dt>Recipient Address</dt>
                <dd><StellarAddress address={stream.recipient} /></dd>
              </div>
              <div>
                <dt>Payment Rate</dt>
                <dd className="detail-rate-highlight">{stream.rate}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{stream.schedule}</dd>
              </div>
              <div>
                <dt>Stream Created</dt>
                <dd><Timestamp iso={stream.createdAt} /></dd>
              </div>
              <div>
                <dt>Last Updated</dt>
                <dd><Timestamp iso={stream.updatedAt} /></dd>
              </div>
              {stream.memo && (
                <div>
                  <dt>Memo</dt>
                  <dd>{stream.memo}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Settlement Details (if applicable) */}
          {(stream.settlementTxHash || stream.withdrawal) && (
            <section className="detail-card" aria-labelledby="settlement-heading">
              <h2 id="settlement-heading" className="detail-card__heading">Settlement &amp; Chain Details</h2>
              <div className="receipt-divider" style={{ margin: "0.75rem 0" }} />
              <dl className="detail-kv">
                {stream.settlementTxHash && (
                  <div>
                    <dt>Settlement TX</dt>
                    <dd><TxHash hash={stream.settlementTxHash} /></dd>
                  </div>
                )}
                {stream.withdrawal && (
                  <>
                    <div>
                      <dt>Withdrawal State</dt>
                      <dd style={{ textTransform: "capitalize" }}>{stream.withdrawal.state}</dd>
                    </div>
                    <div>
                      <dt>Requested At</dt>
                      <dd><Timestamp iso={stream.withdrawal.requestedAt} /></dd>
                    </div>
                    {stream.withdrawal.confirmedTxHash && (
                      <div>
                        <dt>Confirmed TX</dt>
                        <dd><TxHash hash={stream.withdrawal.confirmedTxHash} /></dd>
                      </div>
                    )}
                    {stream.withdrawal.failureCode && (
                      <div>
                        <dt>Failure Code</dt>
                        <dd><code className="receipt-mono">{stream.withdrawal.failureCode}</code></dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </section>
          )}

          {/* Next Action Panel */}
          <section className="detail-card detail-action-card no-print" aria-labelledby="action-heading">
            <h2 id="action-heading" className="detail-card__heading">Stream Operations</h2>
            <div className="receipt-divider" style={{ margin: "0.75rem 0" }} />
            <p className="detail-action-desc">
              Execute lifecycle actions directly on the Stellar ledger, or export / save your certified payment stream receipt.
            </p>
            <div className="detail-actions-row">
              <button
                className="button button--primary detail-action-btn"
                type="button"
                onClick={handleAction}
                disabled={isProcessing || isIncidentMode || stream.status === "withdrawn"}
              >
                {isProcessing ? "Processing..." : nextAction}
              </button>
              
              <Link href={`/streams/${stream.id}/receipt`} className="button button--secondary detail-action-btn">
                Print Stream Receipt
              </Link>
              {actionSummary.destructiveAction && stream.status !== "withdrawn" && (
                <button
                  className="button button--danger detail-action-btn"
                  disabled={isProcessing || isIncidentMode}
                  onClick={() => setIsDestructiveOpen(true)}
                  type="button"
                >
                  {actionSummary.destructiveAction === "cancel" ? "Cancel Stream" : "Withdraw Funds"}
                </button>
              )}
            </div>
            {actionSummary.destructiveAction === "cancel" && (
              <p className="detail-action-note">
                Large cancels require a typed amount confirmation before the request is submitted.
              </p>
            )}
            {isIncidentMode && (
              <p className="detail-incident-warning" role="alert">
                ⚠️ On-chain operations are temporarily paused during incident mode.
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Payment Timeline */}
        <div className="detail-right-col">
          <PaymentTimeline stream={stream} />
        </div>
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

      {actionSummary.destructiveAction && (
        <ConfirmCancel
          action={actionSummary.destructiveAction}
          amountLabel={actionSummary.amountLabel}
          isOpen={isDestructiveOpen}
          onClose={() => setIsDestructiveOpen(false)}
          onConfirm={handleDestructiveAction}
          recipientLabel={stream.label || stream.email || stream.recipient}
          requiresTypedAmount={actionSummary.requiresTypedAmount}
        />
      )}
    </main>
  );
}
