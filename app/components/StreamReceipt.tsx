"use client";

import { useState } from "react";
import type { Stream } from "../types/openapi";

type StreamReceiptProps = {
  stream: Stream;
  network?: "testnet" | "mainnet";
  generatedAt?: string;
  note?: string;
  hideToolbar?: boolean;
};

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function formatUtc(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      aria-label="Copy to clipboard"
      className="receipt-copy-btn no-print"
      onClick={handleCopy}
      type="button"
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

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  ended: "Ended",
  paused: "Paused",
  withdrawn: "Withdrawn",
};

export function StreamReceipt({
  stream,
  network = "testnet",
  generatedAt,
  note,
  hideToolbar = false,
}: StreamReceiptProps) {
  const generated = generatedAt ?? new Date().toISOString();
  const networkLabel = network === "mainnet" ? "Stellar Mainnet" : "Stellar Testnet";
  const statusLabel = STATUS_LABELS[stream.status] ?? stream.status;

  const handlePrint = () => window.print();

  return (
    <div className="receipt-shell">
      {/* On-screen print trigger */}
      {!hideToolbar && (
        <div className="receipt-toolbar no-print">
          <button className="button button--primary" onClick={handlePrint} type="button">
            Print / Save as PDF
          </button>
        </div>
      )}

      {/* ── Receipt document ── */}
      <article aria-label="Payment stream receipt" className="receipt-doc">

        {/* Header */}
        <header className="receipt-header">
          <div className="receipt-brand">
            <span className="receipt-brand__wordmark">StreamPay</span>
            <span className="receipt-brand__tagline">Payment Stream Receipt</span>
          </div>
          <div className="receipt-header__meta">
            <span className="receipt-network-badge" data-network={network}>
              {networkLabel}
            </span>
          </div>
        </header>

        <div className="receipt-divider" />

        {/* H1 — Stream identity */}
        <section className="receipt-section receipt-section--identity">
          <h1 className="receipt-h1">Stream Summary</h1>
          <div className="receipt-id-row">
            <dl className="receipt-kv receipt-kv--inline">
              <div>
                <dt>Stream ID</dt>
                <dd>
                  <code className="receipt-mono">{stream.id}</code>
                </dd>
              </div>
            </dl>
            <span className={`receipt-status-badge receipt-status-badge--${stream.status}`}>
              {statusLabel}
            </span>
          </div>
        </section>

        <div className="receipt-divider" />

        {/* H2 — Recipient */}
        <section className="receipt-section">
          <h2 className="receipt-h2">Recipient</h2>
          <dl className="receipt-kv">
            {stream.label && (
              <div>
                <dt>Name / Label</dt>
                <dd>{stream.label}</dd>
              </div>
            )}
            <div>
              <dt>Stellar Address</dt>
              <dd>
                <StellarAddress address={stream.recipient} />
              </dd>
            </div>
            {stream.email && (
              <div>
                <dt>Email</dt>
                <dd>{stream.email}</dd>
              </div>
            )}
            {stream.memo && (
              <div>
                <dt>Memo</dt>
                <dd>{stream.memo}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="receipt-divider" />

        {/* H2 — Payment details */}
        <section className="receipt-section">
          <h2 className="receipt-h2">Payment Details</h2>
          <dl className="receipt-kv">
            <div>
              <dt>Rate</dt>
              <dd>{stream.rate}</dd>
            </div>
            <div>
              <dt>Schedule</dt>
              <dd>{stream.schedule}</dd>
            </div>
            <div>
              <dt>Stream Created</dt>
              <dd>{formatUtc(stream.createdAt)}</dd>
            </div>
            <div>
              <dt>Last Updated</dt>
              <dd>{formatUtc(stream.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        {/* H2 — Stellar / chain details */}
        {(stream.settlementTxHash || stream.withdrawal) && (
          <>
            <div className="receipt-divider" />
            <section className="receipt-section">
              <h2 className="receipt-h2">Settlement &amp; Chain Details</h2>
              <dl className="receipt-kv">
                {stream.settlementTxHash && (
                  <div>
                    <dt>Settlement TX</dt>
                    <dd>
                      <TxHash hash={stream.settlementTxHash} />
                    </dd>
                  </div>
                )}
                {stream.withdrawal && (
                  <>
                    <div>
                      <dt>Withdrawal State</dt>
                      <dd style={{ textTransform: "capitalize" }}>{stream.withdrawal.state}</dd>
                    </div>
                    <div>
                      <dt>Withdrawal Requested</dt>
                      <dd>{formatUtc(stream.withdrawal.requestedAt)}</dd>
                    </div>
                    {stream.withdrawal.confirmedTxHash && (
                      <div>
                        <dt>Confirmed TX</dt>
                        <dd>
                          <TxHash hash={stream.withdrawal.confirmedTxHash} />
                        </dd>
                      </div>
                    )}
                    {stream.withdrawal.failureCode && (
                      <div>
                        <dt>Failure Code</dt>
                        <dd>
                          <code className="receipt-mono">{stream.withdrawal.failureCode}</code>
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <dt>Network</dt>
                  <dd>{networkLabel}</dd>
                </div>
              </dl>
            </section>
          </>
        )}

        <div className="receipt-divider" />

        {/* H2 — Support */}
        <section className="receipt-section">
          <h2 className="receipt-h2">Support Reference</h2>
          <dl className="receipt-kv">
            <div>
              <dt>Support ID</dt>
              <dd className="receipt-support-id">
                [Issued on request — contact support@streampay.io]
              </dd>
            </div>
            {stream.partnerId && (
              <div>
                <dt>Partner ID</dt>
                <dd>
                  <code className="receipt-mono">{stream.partnerId}</code>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {note && (
          <>
            <div className="receipt-divider" />
            <section className="receipt-section">
              <h2 className="receipt-h2">Receipt Note</h2>
              <p className="receipt-note-text">{note}</p>
            </section>
          </>
        )}

        <div className="receipt-divider receipt-divider--thick" />

        {/* Footer */}
        <footer className="receipt-footer">
          <p className="receipt-footer__legal">
            StreamPay &mdash; This document is generated from system records and is intended
            for reference and compliance purposes only. It does not constitute a legal
            contract or binding financial instrument. All amounts are denominated in Stellar
            Lumens (XLM) and reflect the state of the stream at the time of generation.
          </p>
          <p className="receipt-footer__timestamp">
            Generated at: {formatUtc(generated)}
          </p>
        </footer>
      </article>
    </div>
  );
}
