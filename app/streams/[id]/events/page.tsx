import Link from "next/link";
import { notFound } from "next/navigation";
import { EventTimeline, type ContractEvent } from "../../../components/EventTimeline";

/**
 * Contract events panel — stream detail sub-page.
 *
 * Surfaces recent on-chain contract events for a stream with a type filter.
 * Data is mocked here to match the placeholder streams used elsewhere in the
 * app (see `app/streams/[id]/page.tsx`); swap `MOCK_EVENTS` for a real
 * `/api/streams/:id/contract-events` fetch once the indexer is wired in.
 */

/** Display labels for the mocked streams, keyed by id. */
const STREAM_LABELS: Record<string, string> = {
  "stream-ada": "Ada Creative Studio",
  "stream-kemi": "Kemi Onboarding Support",
  "stream-yusuf": "Yusuf QA Partnership",
};

const MOCK_EVENTS: Record<string, ContractEvent[]> = {
  "stream-ada": [
    {
      id: "evt-ada-1",
      type: "created",
      summary: "Stream created and escrow funded",
      timestamp: "2024-11-01T09:00:00.000Z",
      txHash: "c3f8a12e4b76d09e1a23f456bc78d90e1f234a5678b9c0d1e2f3a4b5c6d7e8f9",
      ledger: 51234001,
      amount: "120 XLM",
    },
    {
      id: "evt-ada-2",
      type: "started",
      summary: "Streaming activated; linear vesting began",
      timestamp: "2024-11-01T09:05:00.000Z",
      txHash: "d4a9b23f5c87e10f2b34a567cd89e01f2a345b6789c0d1e2f3a4b5c6d7e8f9a0",
      ledger: 51234060,
    },
    {
      id: "evt-ada-3",
      type: "paused",
      summary: "Stream paused by sender; accrual frozen",
      timestamp: "2024-11-10T14:00:00.000Z",
      txHash: "e5b0c34a6d98f21a3c45b678de90f12a3b456c789d0e1f2a3b4c5d6e7f8a9b0c",
      ledger: 51310500,
    },
    {
      id: "evt-ada-4",
      type: "resumed",
      summary: "Stream resumed; vesting continued",
      timestamp: "2024-11-12T08:30:00.000Z",
      txHash: "f6c1d45b7ea90f32b456c789ef01a23b4c567d89e0f1a2b3c4d5e6f7a8b9c0d1",
      ledger: 51331200,
    },
    {
      id: "evt-ada-5",
      type: "withdrawn",
      summary: "Recipient withdrew vested funds",
      timestamp: "2024-11-20T14:30:00.000Z",
      txHash: "a7d2e56c8fb01a43c567d89af012b34c5d678e90f1a2b3c4d5e6f7a8b9c0d1e2",
      ledger: 51420900,
      amount: "48 XLM",
    },
  ],
  "stream-kemi": [
    {
      id: "evt-kemi-1",
      type: "created",
      summary: "Draft stream created and escrow funded",
      timestamp: "2024-11-15T11:00:00.000Z",
      txHash: "b8e3f67d9ac12b54d678e90bf123c45d6e789f01a2b3c4d5e6f7a8b9c0d1e2f3",
      ledger: 51375000,
      amount: "32 XLM",
    },
  ],
  "stream-yusuf": [
    {
      id: "evt-yusuf-1",
      type: "created",
      summary: "Stream created and escrow funded",
      timestamp: "2024-10-01T08:00:00.000Z",
      txHash: "c9f4a78e0bd23c65e789f01ca234d56e7f890a12b3c4d5e6f7a8b9c0d1e2f3a4",
      ledger: 50980000,
      amount: "540 XLM",
    },
    {
      id: "evt-yusuf-2",
      type: "started",
      summary: "Streaming activated; linear vesting began",
      timestamp: "2024-10-01T08:04:00.000Z",
      txHash: "d0a5b89f1ce34d76f890a12db345e67f8a901b23c4d5e6f7a8b9c0d1e2f3a4b5",
      ledger: 50980040,
    },
    {
      id: "evt-yusuf-3",
      type: "settled",
      summary: "Stream settled; all funds released from escrow",
      timestamp: "2024-11-19T17:45:00.000Z",
      txHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      ledger: 51415500,
      amount: "540 XLM",
    },
    {
      id: "evt-yusuf-4",
      type: "withdrawn",
      summary: "Recipient requested withdrawal of available funds",
      timestamp: "2024-11-19T18:00:00.000Z",
      txHash: "e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
      ledger: 51415560,
      amount: "18 XLM",
    },
  ],
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StreamEventsPage({ params }: Props) {
  const { id } = await params;
  const events = MOCK_EVENTS[id];

  // Unknown stream ids 404 just like the sibling detail/receipt pages.
  if (!events) {
    notFound();
    return null;
  }

  const label = STREAM_LABELS[id] ?? "Payment Stream";

  return (
    <main className="page-shell">
      <nav aria-label="Breadcrumb" className="no-print">
        <Link href={`/streams/${id}`} className="detail-back-link">
          ← Back to Stream
        </Link>
      </nav>

      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">Contract Events</p>
          <h1 className="page-hero__title detail-title">{label}</h1>
          <p className="page-hero__description">
            Audit the recent on-chain contract events for this stream and filter
            them by event type.
          </p>
        </div>
      </section>

      <div className="detail-card">
        <EventTimeline events={events} />
      </div>
    </main>
  );
}

export async function generateStaticParams() {
  return Object.keys(MOCK_EVENTS).map((id) => ({ id }));
}

export function generateMetadata() {
  return {
    title: "Contract Events — StreamPay",
    description:
      "Recent on-chain contract events for a payment stream, filterable by type.",
  };
}
