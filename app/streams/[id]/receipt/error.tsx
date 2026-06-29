"use client";

import Link from "next/link";
import { ErrorRecovery } from "../../../components/ErrorRecovery";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary for /streams/[id]/receipt.
 *
 * Shown when the server component throws during rendering (e.g. data fetch
 * failure, serialisation error). Uses the shared ErrorRecovery layout so the
 * visual treatment matches the global error page, while messaging is specific
 * to the receipt context ("your payment data is safe").
 */
export default function ReceiptError({ error, reset }: Props) {
  return (
    <ErrorRecovery
      body="Something went wrong while loading this payment receipt. Your payment data is safe — this is a display issue only. Try refreshing, or go back to your streams list."
      eyebrow="Receipt unavailable"
      heading="We couldn't load this receipt"
      helperNote="If the problem persists, contact support with the reference below."
      primaryAction={
        <button
          className="button button--primary error-page__action"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      }
      reference={error.digest}
      secondaryAction={
        <Link
          className="button button--secondary error-page__action"
          href="/streams"
        >
          Back to streams
        </Link>
      }
      variant="server"
    />
  );
}
