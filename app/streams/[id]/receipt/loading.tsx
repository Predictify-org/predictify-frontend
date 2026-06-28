/**
 * Streaming loading UI for /streams/[id]/receipt.
 *
 * Next.js renders this file automatically while the server component above it
 * resolves, so users see a skeleton rather than a blank page on slow networks.
 * The skeleton mirrors the section structure of StreamReceipt to prevent layout
 * shift when the real document swaps in.
 */

function SkeletonField() {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <div className="skeleton skeleton--label" />
      <div className="skeleton skeleton--value" />
    </div>
  );
}

export default function ReceiptLoading() {
  return (
    <div className="receipt-shell" aria-busy="true" aria-label="Loading receipt">
      {/* Toolbar skeleton */}
      <div className="receipt-toolbar no-print">
        <div className="receipt-note-builder__actions">
          <div className="skeleton skeleton--button" />
          <div
            className="skeleton skeleton--button"
            style={{ width: "5rem" }}
          />
        </div>
      </div>

      {/* Note-builder skeleton */}
      <div className="receipt-note-builder no-print" style={{ display: "grid", gap: "0.5rem" }}>
        <div className="skeleton skeleton--label" />
        <div
          className="skeleton"
          style={{ borderRadius: "0.5rem", height: "6rem" }}
        />
      </div>

      {/* Receipt document skeleton */}
      <article
        aria-hidden="true"
        className="receipt-doc"
        style={{ display: "grid", gap: "1.5rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div className="skeleton skeleton--title" style={{ width: "7rem" }} />
            <div className="skeleton skeleton--text" style={{ width: "12rem" }} />
          </div>
          <div className="skeleton skeleton--badge" />
        </div>

        <div className="receipt-divider" />

        {/* Stream identity */}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div className="skeleton skeleton--title" style={{ width: "9rem" }} />
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div className="skeleton skeleton--value" style={{ width: "11rem" }} />
            <div className="skeleton skeleton--badge" style={{ width: "4.5rem" }} />
          </div>
        </div>

        <div className="receipt-divider" />

        {/* Recipient section */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="skeleton skeleton--title" style={{ width: "6rem" }} />
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <SkeletonField />
            <SkeletonField />
          </div>
        </div>

        <div className="receipt-divider" />

        {/* Payment details section */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="skeleton skeleton--title" style={{ width: "9rem" }} />
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
        </div>
      </article>
    </div>
  );
}
