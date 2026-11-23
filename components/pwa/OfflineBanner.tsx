"use client";

import { useEffect, useState } from "react";
import { announce } from "@/hooks/use-global-live-region";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      announce({ message: "You are offline. Some features may be unavailable.", priority: "assertive" });
    };
    const goOnline = () => {
      setOffline(false);
      announce({ message: "You are back online.", priority: "polite" });
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    if (!navigator.onLine) goOffline();

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#ef4444",
        color: "#fff",
        textAlign: "center",
        padding: "0.6rem 1rem",
        fontWeight: 600,
        fontSize: "0.9rem",
      }}
    >
      📡 You're offline — showing cached data where available.
    </div>
  );
}
