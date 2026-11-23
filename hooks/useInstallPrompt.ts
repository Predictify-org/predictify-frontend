"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferredRef.current) return "unavailable";
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    deferredRef.current = null;
    setCanInstall(false);
    return outcome;
  }

  return { canInstall, promptInstall };
}
