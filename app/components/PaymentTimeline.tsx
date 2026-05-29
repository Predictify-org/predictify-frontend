"use client";

import type { Stream } from "../types/openapi";

type PaymentTimelineProps = {
  stream: Stream;
};

type StepStatus = "past" | "current" | "future";

interface TimelineStep {
  label: string;
  title: string;
  description: string;
  status: StepStatus;
  timestamp?: string;
  txHash?: string;
}

function truncateHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

function formatUtc(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  } catch {
    return iso;
  }
}

export function PaymentTimeline({ stream }: PaymentTimelineProps) {
  const { status, createdAt, updatedAt, settlementTxHash, withdrawal } = stream;

  // Map stream status to timeline step states
  // Steps: Created -> Started -> Settled -> Withdrawn
  let createdState: StepStatus = "past";
  let startedState: StepStatus = "past";
  let settledState: StepStatus = "past";
  let withdrawnState: StepStatus = "past";

  if (status === "draft") {
    createdState = "past";
    startedState = "current";
    settledState = "future";
    withdrawnState = "future";
  } else if (status === "active" || status === "paused") {
    createdState = "past";
    startedState = "past";
    settledState = "current";
    withdrawnState = "future";
  } else if (status === "ended") {
    createdState = "past";
    startedState = "past";
    settledState = "past";
    withdrawnState = "current";
  } else if (status === "withdrawn" || (withdrawal && withdrawal.state === "succeeded")) {
    createdState = "past";
    startedState = "past";
    settledState = "past";
    withdrawnState = "past";
  }

  const steps: TimelineStep[] = [
    {
      label: "created",
      title: "Stream Created",
      description: "Payment stream record initialized in StreamPay contract registry.",
      status: createdState,
      timestamp: createdAt,
    },
    {
      label: "started",
      title: "Stream Started",
      description: status === "draft"
        ? "Awaiting activation of the stream."
        : "Stream is active and accumulating balance according to rate schedule.",
      status: startedState,
      timestamp: status !== "draft" ? createdAt : undefined,
    },
    {
      label: "settled",
      title: "Funds Settled",
      description: settlementTxHash
        ? "Stream balance successfully locked and settled on-chain."
        : status === "active" || status === "paused"
        ? "Actively streaming. Awaiting next periodic contract settlement cycle."
        : "Pending settlement execution.",
      status: settledState,
      timestamp: settlementTxHash ? updatedAt : undefined,
      txHash: settlementTxHash,
    },
    {
      label: "withdrawn",
      title: "Funds Withdrawn",
      description: withdrawal?.state === "succeeded" || status === "withdrawn"
        ? "Recipient successfully claimed and withdrew settled funds to destination wallet."
        : withdrawal?.state === "pending"
        ? "Withdrawal transaction is processing on the Stellar Network."
        : status === "ended"
        ? "Stream ended. Recipient can now withdraw available settled funds."
        : "Withdrawal will be available once the stream is settled.",
      status: withdrawnState,
      timestamp: withdrawal?.requestedAt,
      txHash: withdrawal?.confirmedTxHash,
    },
  ];

  return (
    <section className="timeline-section" aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="timeline-title">Payment Timeline</h2>
      <ol className="payment-timeline" aria-label="Payment lifecycle stages">
        {steps.map((step, index) => {
          const isCurrent = step.status === "current";
          const isPast = step.status === "past";
          const statusText = isCurrent
            ? "Current active stage"
            : isPast
            ? "Completed stage"
            : "Upcoming stage";

          return (
            <li
              key={step.label}
              className={`timeline-item timeline-item--${step.status}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* Visual Step Marker */}
              <div className="timeline-marker">
                <span className="timeline-dot" aria-hidden="true" />
                {index < steps.length - 1 && <span className="timeline-line" aria-hidden="true" />}
              </div>

              {/* Step Content */}
              <div className="timeline-content">
                <div className="timeline-header-row">
                  <h3 className="timeline-item-title">
                    {step.title}
                    <span className="sr-only"> ({statusText})</span>
                  </h3>
                  {step.timestamp && (
                    <time className="timeline-time" dateTime={step.timestamp}>
                      {formatUtc(step.timestamp)}
                    </time>
                  )}
                </div>
                <p className="timeline-item-desc">{step.description}</p>
                {step.txHash && (
                  <div className="timeline-hash-wrap">
                    <span className="timeline-hash-label">Transaction: </span>
                    <code className="timeline-hash" title={step.txHash}>
                      {truncateHash(step.txHash)}
                    </code>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
