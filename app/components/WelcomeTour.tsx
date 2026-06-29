"use client";

import { useEffect, useState } from "react";

const WELCOME_TOUR_KEY = "streampay:welcome-tour-dismissed";

const TOUR_STEPS = [
  {
    title: "Welcome to StreamPay",
    body: "StreamPay lets you pay collaborators and vendors on a continuous, steady schedule.",
  },
  {
    title: "Create your first stream",
    body: "Click 'Create Stream' to set a recipient, rate, and start date. Funds flow every second.",
  },
  {
    title: "Track everything in one list",
    body: "Your streams page shows all active, draft, and ended streams with their next action.",
  },
];

export function WelcomeTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_TOUR_KEY)) {
        setVisible(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(WELCOME_TOUR_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
      className="welcome-tour-overlay"
    >
      <div className="welcome-tour">
        <p className="welcome-tour__step-indicator" aria-live="polite">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="welcome-tour-title" className="welcome-tour__title">
          {current?.title}
        </h2>
        <p className="welcome-tour__body">{current?.body}</p>
        <div className="welcome-tour__actions">
          <button className="button button--ghost" type="button" onClick={dismiss}>
            Skip tour
          </button>
          <button className="button button--primary" type="button" onClick={next}>
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
