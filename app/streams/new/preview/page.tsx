"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StreamPreview, type StreamPreviewData } from "../../../components/StreamPreview";

/**
 * CreateStream wizard — Preview step.
 *
 * Renders a side-by-side review of the configured stream (parameters + computed
 * totals) before the creator confirms. Stream parameters are passed through the
 * URL query so the step is deep-linkable and survives a refresh.
 *
 * Query params: `recipient`, `rate`, `schedule`, `duration`, `token`, `gas`.
 */

function parsePreviewData(params: URLSearchParams): StreamPreviewData {
  const durationRaw = Number(params.get("duration"));
  return {
    recipient: params.get("recipient") ?? "",
    rate: params.get("rate") ?? "",
    schedule: params.get("schedule") ?? "day",
    durationIntervals: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : 1,
    token: params.get("token") ?? "XLM",
    gasOnRecipient: params.get("gas") === "recipient",
  };
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const data = parsePreviewData(new URLSearchParams(searchParams.toString()));

  return (
    <main className="page-shell" aria-labelledby="preview-page-title">
      <header className="page-hero">
        <p className="page-hero__eyebrow">Create stream</p>
        <h1 id="preview-page-title" className="page-hero__title">
          Preview &amp; confirm
        </h1>
        <p className="page-hero__description">
          Double-check the details below. Nothing is sent on-chain until you confirm.
        </p>
      </header>

      <StreamPreview data={data} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "flex-end",
        }}
      >
        <Link href="/streams/new" className="button button--secondary">
          Back to edit
        </Link>
        <Link href="/streams/new?confirm=1" className="button button--primary">
          Confirm &amp; create
        </Link>
      </div>
    </main>
  );
}

export default function StreamPreviewPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<main className="page-shell">Loading preview…</main>}>
      <PreviewContent />
    </Suspense>
  );
}
