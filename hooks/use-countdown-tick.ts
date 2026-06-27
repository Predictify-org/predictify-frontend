"use client";

import { useEffect, useState } from "react";

/**
 * Shared RequestAnimationFrame Tick Manager
 * Ensures a single rAF loop drives all countdown components for optimal performance.
 */

type Listener = (time: number) => void;
const listeners = new Set<Listener>();
let rafId: number | null = null;
let lastTime = typeof window !== "undefined" ? Date.now() : 0;

const tick = () => {
  const now = Date.now();
  // Only notify if time has actually changed (avoid redundant renders)
  if (now !== lastTime) {
    lastTime = now;
    listeners.forEach((listener) => listener(now));
  }
  rafId = requestAnimationFrame(tick);
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  if (rafId === null && typeof window !== "undefined") {
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};

/**
 * Hook to subscribe to a shared high-precision countdown tick.
 * Returns the current timestamp updated via a single rAF loop.
 */
export function useCountdownTick() {
  const [now, setNow] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));

  useEffect(() => {
    return subscribe(setNow);
  }, []);

  return now;
}
