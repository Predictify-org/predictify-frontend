"use client";

import { useState, useEffect, useCallback } from "react";

export type Density = "cozy" | "compact" | "ultra";

const STORAGE_KEY = "predictify-density";

function getDefaultDensity(): Density {
  if (typeof window === "undefined") return "cozy";
  if ("matchMedia" in window) {
    const prefersReduced = window.matchMedia("(prefers-reduced-data: reduce)").matches;
    if (prefersReduced) return "compact";
  }
  return "cozy";
}

function loadDensity(): Density {
  if (typeof window === "undefined") return getDefaultDensity();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "cozy" || stored === "compact" || stored === "ultra") return stored;
  } catch {}
  return getDefaultDensity();
}

function saveDensity(density: Density): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch {}
}

export const densityTokens = {
  cozy: {
    cardPadding: "p-4",
    cardGap: "gap-4",
    titleSize: "text-sm",
    bodySize: "text-xs",
    captionSize: "text-[10px]",
    chipPadding: "px-2 py-1",
    thumbnailHeight: "h-20",
    progressHeight: "h-1.5",
    showDescription: true,
    showDates: true,
    cardWidth: "w-[calc(100vw-3rem)] max-w-[280px] sm:w-[280px] md:w-[300px] lg:w-[320px]",
  },
  compact: {
    cardPadding: "p-2.5",
    cardGap: "gap-2.5",
    titleSize: "text-xs",
    bodySize: "text-[10px]",
    captionSize: "text-[9px]",
    chipPadding: "px-1.5 py-0.5",
    thumbnailHeight: "h-14",
    progressHeight: "h-1",
    showDescription: false,
    showDates: true,
    cardWidth: "w-[calc(100vw-4rem)] max-w-[240px] sm:w-[240px] md:w-[260px] lg:w-[280px]",
  },
  ultra: {
    cardPadding: "p-2",
    cardGap: "gap-2",
    titleSize: "text-[11px]",
    bodySize: "text-[9px]",
    captionSize: "text-[8px]",
    chipPadding: "px-1 py-0.5",
    thumbnailHeight: "h-10",
    progressHeight: "h-[3px]",
    showDescription: false,
    showDates: false,
    cardWidth: "w-[calc(100vw-5rem)] max-w-[200px] sm:w-[200px] md:w-[220px] lg:w-[240px]",
  },
} as const;

export type DensityTokens = typeof densityTokens;

export function useDensity() {
  const [density, setDensityState] = useState<Density>("cozy");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initial = loadDensity();
    setDensityState(initial);
    setIsReady(true);
  }, []);

  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    saveDensity(value);
    // Dispatch custom event for cross-tab sync
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: value }));
  }, []);

  const cycleDensity = useCallback(() => {
    setDensityState((prev) => {
      const next = prev === "cozy" ? "compact" : prev === "compact" ? "ultra" : "cozy";
      saveDensity(next);
      return next;
    });
  }, []);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const value = e.newValue as Density;
        if (value === "cozy" || value === "compact" || value === "ultra") {
          setDensityState(value);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const tokens = densityTokens[density];

  return {
    density,
    setDensity,
    cycleDensity,
    tokens,
    isReady,
    densities: ["cozy", "compact", "ultra"] as const,
  };
}