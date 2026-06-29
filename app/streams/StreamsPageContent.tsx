import { EmptyState } from "../components/EmptyState";
import { StreamRow, type StreamRowData } from "../components/StreamRow";

export type StreamsViewState = "empty" | "loading" | "populated";

const streamListCopy = {
  description:
    "Track recipients, rates, statuses, and the next action from one scan-friendly streams list.",
  empty: {
    actionLabel: "Create Your First Stream",
    description: "No streams yet. Create one to start paying collaborators and vendors on a steady schedule.",
    eyebrow: "Streams",
    title: "Your streams list is empty",
  },
  heading: "Streams",
  loadingLabel: "Loading streams",
  populatedCount: "3 active records",
  primaryCta: "Create Stream",
} as const;

export const mockStreams: StreamRowData[] = [
  {
    id: "stream-ada",
    nextAction: "Pause",
    rate: "120 XLM / month",
    recipient: "Ada Creative Studio",
    schedule: "Pays every 30 days",
    status: "active",
  },
  {
    id: "stream-kemi",
    nextAction: "Start",
    rate: "32 XLM / week",
    recipient: "Kemi Onboarding Support",
    schedule: "Draft stream ready to launch",
    status: "draft",
  },
  {
    id: "stream-yusuf",
    nextAction: "Withdraw",
    rate: "18 XLM / day",
    recipient: "Yusuf QA Partnership",
    schedule: "Ended yesterday with funds available",
    status: "ended",
  },
];

type StreamsPageContentProps = {
  state?: StreamsViewState;
  streams?: StreamRowData[];
};

function StreamListSkeleton() {
  return (
    <section aria-label={streamListCopy.loadingLabel} aria-busy="true" className="stream-list">
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          aria-hidden="true"
          className="stream-row stream-row--skeleton"
          data-testid="stream-row-skeleton"
          key={`stream-skeleton-${index + 1}`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="stream-row__primary">
            <div className="stream-row__skeleton-block">
              {/* Title skeleton matches StreamRow recipient text width */}
              <div className="skeleton skeleton--title" style={{ width: "60%", height: "1.125rem" }} />
              {/* Subtitle skeleton matches schedule text */}
              <div className="skeleton skeleton--text" style={{ width: "40%", height: "0.875rem", marginTop: "0.25rem" }} />
            </div>
            {/* Badge skeleton matches status badge size */}
            <div className="skeleton skeleton--badge" style={{ width: "4.5rem", height: "1.5rem", borderRadius: "9999px" }} />
          </div>

          <div className="stream-row__meta stream-row__meta--skeleton">
            <div>
              <div className="skeleton skeleton--label" style={{ width: "2.5rem", height: "0.75rem" }} />
              <div className="skeleton skeleton--value" style={{ width: "5rem", height: "1rem", marginTop: "0.25rem" }} />
            </div>
            <div>
              <div className="skeleton skeleton--label" style={{ width: "3rem", height: "0.75rem" }} />
              <div className="skeleton skeleton--value" style={{ width: "4rem", height: "1rem", marginTop: "0.25rem" }} />
            </div>
          </div>

          {/* Action button skeleton matches button width */}
          <div className="skeleton skeleton--button" style={{ width: "5.5rem", height: "2rem", borderRadius: "0.375rem" }} />
        </article>
      ))}
    </section>
  );
}

export function StreamsPageContent({
  state = "populated",
  streams = mockStreams,
}: StreamsPageContentProps) {
  const isEmpty = state === "empty" || streams.length === 0;

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">{streamListCopy.heading}</p>
          <h1 className="page-hero__title">Manage every stream from one list.</h1>
          <p className="page-hero__description">{streamListCopy.description}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="button button--secondary" type="button">
            Export History
          </button>
          <button className="button button--primary" type="button">
            {streamListCopy.primaryCta}
          </button>
        </div>
      </section>

      <section className="stream-layout" aria-labelledby="streams-overview-title">
        <div className="section-heading">
          <div>
            <h2 className="section-heading__title" id="streams-overview-title">
              Streams overview
            </h2>
            <p className="section-heading__description">
              Recipient, rate, status, and the primary next action stay visible at a glance.
            </p>
          </div>
          {state === "populated" && <p className="section-heading__meta">{streamListCopy.populatedCount}</p>}
        </div>

        {state === "loading" ? (
          <StreamListSkeleton />
        ) : isEmpty ? (
          <EmptyState
            actionLabel={streamListCopy.empty.actionLabel}
            description={streamListCopy.empty.description}
            eyebrow={streamListCopy.empty.eyebrow}
            title={streamListCopy.empty.title}
          />
        ) : (
          <section aria-label="Streams list" className="stream-list">
            {streams.map((stream) => (
              <StreamRow key={stream.id} stream={stream} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
