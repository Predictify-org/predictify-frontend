import Link from "next/link";
import { ErrorRecovery } from "./components/ErrorRecovery";

export default function NotFound() {
  return (
    <ErrorRecovery
      variant="not-found"
      eyebrow="Page not found"
      heading="This page could not be found"
      body="The link may be old, incomplete, or no longer available. You can head back to StreamPay home and keep working from there."
      helperNote="If you followed a link from an email or shared document, ask for a fresh link."
      primaryAction={
        <Link className="button button--primary error-page__action" href="/">
          Go to home
        </Link>
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
