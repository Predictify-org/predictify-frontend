"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const TRANSITION_DURATION_MS = 350;
const INITIAL_PROGRESS = 20;

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const previousRouteRef = useRef<string>("");

  useEffect(() => {
    const currentRoute = `${pathname}?${searchParams.toString()}`;

    if (previousRouteRef.current && previousRouteRef.current !== currentRoute) {
      setProgress(INITIAL_PROGRESS);
      setVisible(true);

      const advanceTimer = window.setTimeout(() => {
        setProgress(70);
      }, 120);

      const completeTimer = window.setTimeout(() => {
        setVisible(false);
      }, TRANSITION_DURATION_MS);

      return () => {
        window.clearTimeout(advanceTimer);
        window.clearTimeout(completeTimer);
      };
    }

    previousRouteRef.current = currentRoute;
  }, [pathname, searchParams]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Page loading"
        className="h-1 w-full overflow-hidden bg-transparent"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
