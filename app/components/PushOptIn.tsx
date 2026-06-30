"use client";

import { useEffect, useMemo, useState } from "react";

type PushOptInProps = {
  emailFallbackEnabled: boolean;
  onEmailFallbackChange: (nextValue: boolean) => void;
};

type PushAvailability =
  | "checking"
  | "supported"
  | "unsupported"
  | "denied"
  | "enabled";

function detectAvailability(): PushAvailability {
  if (typeof window === "undefined") return "checking";
  if (!window.isSecureContext) return "unsupported";
  if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "enabled";
  if (Notification.permission === "denied") return "denied";
  return "supported";
}

export function PushOptIn({
  emailFallbackEnabled,
  onEmailFallbackChange,
}: PushOptInProps) {
  const [availability, setAvailability] = useState<PushAvailability>("checking");
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setAvailability(detectAvailability());
  }, []);

  const details = useMemo(() => {
    switch (availability) {
      case "enabled":
        return {
          tone: "success",
          title: "Push notifications are on",
          description:
            "GrantFox updates can reach this browser instantly when stream activity changes.",
          cta: null,
        };
      case "denied":
        return {
          tone: "warning",
          title: "Push access is blocked in this browser",
          description:
            "We cannot send web push here, so email fallback becomes the safe default for critical alerts.",
          cta: null,
        };
      case "unsupported":
        return {
          tone: "info",
          title: "Web push is unavailable on this device",
          description:
            "Push needs a secure, supported browser context. Email fallback keeps essential notifications flowing.",
          cta: null,
        };
      case "supported":
        return {
          tone: "info",
          title: "Enable browser push for instant alerts",
          description:
            "We only prompt in supported secure contexts. If you skip or deny it, email can handle critical updates instead.",
          cta: "Enable push notifications",
        };
      default:
        return {
          tone: "info",
          title: "Checking push support",
          description: "Reviewing browser support before we offer web push.",
          cta: null,
        };
    }
  }, [availability]);

  const requestPermission = async () => {
    if (availability !== "supported") return;

    setIsRequesting(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setAvailability("enabled");
        setMessage("Push notifications enabled for this browser.");
        return;
      }

      if (permission === "denied") {
        setAvailability("denied");
        onEmailFallbackChange(true);
        setMessage("Push was denied, so email fallback has been enabled.");
        return;
      }

      setMessage("Push setup was skipped. You can keep email fallback on for critical alerts.");
    } finally {
      setIsRequesting(false);
    }
  };

  const showFallback = availability === "unsupported" || availability === "denied" || availability === "supported";

  return (
    <section
      aria-labelledby="push-opt-in-title"
      className={`push-optin push-optin--${details.tone}`}
    >
      <div className="push-optin__copy">
        <p className="push-optin__eyebrow">GrantFox Campaign</p>
        <h2 className="push-optin__title" id="push-opt-in-title">
          {details.title}
        </h2>
        <p className="push-optin__description">{details.description}</p>
        <p className="push-optin__security-note">
          Push prompts are only available in secure browser contexts and never triggered automatically on page load.
        </p>
      </div>

      <div className="push-optin__actions">
        {details.cta && (
          <button
            className="button button--primary"
            disabled={isRequesting}
            onClick={requestPermission}
            type="button"
          >
            {isRequesting ? "Requesting permission..." : details.cta}
          </button>
        )}

        {showFallback && (
          <label className="push-optin__fallback">
            <input
              checked={emailFallbackEnabled}
              onChange={(event) => onEmailFallbackChange(event.target.checked)}
              type="checkbox"
            />
            <span>Email me critical alerts if push is unavailable</span>
          </label>
        )}

        {message && (
          <p className="push-optin__message" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
