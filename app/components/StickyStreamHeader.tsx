"use client";

type StickyStreamHeaderProps = {
  streamId: string;
  status: string;
  amount: string;
  assetCode?: string;
  recipient: string;
};

/** Masks the middle of an address for a compact header summary. */
function shortAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * A compact, sticky summary bar for the stream detail page that stays pinned to
 * the top while the user scrolls, keeping the stream's key facts (amount,
 * status, recipient) in view.
 */
export function StickyStreamHeader({
  streamId,
  status,
  amount,
  assetCode = "XLM",
  recipient,
}: StickyStreamHeaderProps) {
  return (
    <header
      className="sticky-stream-header"
      aria-label={`Stream ${streamId} summary`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.75rem 1rem",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border, #e5e7eb)",
      }}
    >
      <span className="sticky-stream-header__amount">
        {amount} {assetCode}
      </span>
      <span
        className={`sticky-stream-header__status status-badge--${status}`}
        aria-label={`Stream status: ${status}`}
      >
        {status}
      </span>
      <span className="sticky-stream-header__recipient" title={recipient}>
        to {shortAddress(recipient)}
      </span>
    </header>
  );
}
