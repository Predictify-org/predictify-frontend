"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorRecovery } from "./components/ErrorRecovery";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Detect a Stellar/Horizon network dependency failure so we can reassure
// users about funds instead of showing a generic server error.
function isOutage(error: Error): boolean {
  const haystack = `${error.name} ${error.message}`.toLowerCase();
  return /stellar|horizon|soroban|\brpc\b|network service|service unavailable/.test(
    haystack
  );
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface for telemetry; copy shown to the user stays calm and generic.
    console.error(error);
  }, [error]);

  const outage = isOutage(error);

  if (outage) {
    return (
      <ErrorRecovery
        variant="outage"
        eyebrow="Network service"
        heading="Stellar service is temporarily unavailable"
        body="StreamPay cannot reach part of the Stellar service right now. Your funds are not gone. Recent activity may take longer to refresh until the service is back."
        helperNote="You can also check the status page for live updates."
        reference={error.digest}
        primaryAction={
          <button
            type="button"
            className="button button--primary error-page__action"
            onClick={() => reset()}
          >
            Try again
          </button>
        }
        secondaryAction={
          <Link
            className="button button--secondary error-page__action"
            href="/settings"
          >
            Contact support
          </Link>
        }
      />
    );
  }

  return (
    <ErrorRecovery
      variant="server"
      eyebrow="We're fixing it"
      heading="Something went wrong on our side"
      body="StreamPay is having trouble loading this page right now. Our team is already looking into it."
      helperNote="If this keeps happening, support can help with the page you were trying to reach."
      reference={error.digest}
      primaryAction={
        <button
          type="button"
          className="button button--primary error-page__action"
          onClick={() => reset()}
        >
          Try again
        </button>
      }
      secondaryAction={
        <Link
          className="button button--secondary error-page__action"
          href="/activity"
        >
          Visit status page
        </Link>
      }
    />
  );
}
