"use client";

import { useState } from "react";

type ReceiptShareCardProps = {
  streamId: string;
  recipient: string;
  amount: string;
  assetCode?: string;
  /** Start with the recipient address masked (privacy-first default). */
  defaultMasked?: boolean;
};

/** Masks the middle of an address, keeping enough to verify it visually. */
export function maskAddress(address: string): string {
  if (address.length <= 10) return "•".repeat(address.length);
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * A shareable summary card for a stream receipt with an optional privacy mask.
 *
 * The mask defaults to ON so a user does not accidentally publish a full
 * recipient address when sharing a screenshot or the generated share text.
 */
export function ReceiptShareCard({
  streamId,
  recipient,
  amount,
  assetCode = "XLM",
  defaultMasked = true,
}: ReceiptShareCardProps) {
  const [masked, setMasked] = useState(defaultMasked);

  const shownRecipient = masked ? maskAddress(recipient) : recipient;
  const shareText = `StreamPay receipt ${streamId}: ${amount} ${assetCode} to ${shownRecipient}`;

  return (
    <figure className="receipt-share-card" aria-label="Stream receipt share card">
      <div className="receipt-share-card__amount">
        {amount} {assetCode}
      </div>
      <dl className="receipt-share-card__meta">
        <dt>Recipient</dt>
        <dd data-testid="receipt-recipient">{shownRecipient}</dd>
        <dt>Stream</dt>
        <dd>{streamId}</dd>
      </dl>
      <label className="receipt-share-card__mask-toggle">
        <input
          type="checkbox"
          checked={masked}
          onChange={(e) => setMasked(e.target.checked)}
          aria-label="Mask recipient address"
        />
        Mask recipient address
      </label>
      <button
        type="button"
        className="receipt-share-card__copy"
        onClick={() => void navigator.clipboard?.writeText(shareText)}
        aria-label="Copy share text"
      >
        Copy share text
      </button>
    </figure>
  );
}
