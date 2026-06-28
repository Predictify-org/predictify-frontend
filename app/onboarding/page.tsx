import { Explainer } from "../components/Explainer";

export default function OnboardingPage() {
  return (
    <main className="page-shell">
      <header className="page-hero">
        <div>
          <p className="page-hero__eyebrow">New to StreamPay</p>
          <h1 className="page-hero__title">How streaming works</h1>
          <p className="page-hero__description">
            Learn the setup, flow, and payout checkpoints before you launch your first GrantFox stream.
          </p>
        </div>
      </header>

      <Explainer />
    </main>
  );
}
