"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const APP_TITLE = "Predictify";
const DEFAULT_TITLE = "Predictify - Prediction Platform";

export const ROUTE_TITLES: Record<string, string> = {
  "/": DEFAULT_TITLE,
  "/activity-timeline-demo": "Activity Timeline | Predictify",
  "/bets": "Bets | Predictify",
  "/dashboard": "Dashboard | Predictify",
  "/design/accessible-charts": "Accessible Charts | Predictify",
  "/design/icons": "Iconography Guidelines | Predictify",
  "/design/share-cards": "Share Cards | Predictify",
  "/design-system": "Design System | Predictify",
  "/disputes": "Disputes | Predictify",
  "/events": "Markets | Predictify",
  "/events/event-page": "Market Details | Predictify",
  "/events/new": "Create Event | Predictify",
  "/events-virtualized": "Virtualized Events | Predictify",
  "/finances": "Finances | Predictify",
  "/help": "Help | Predictify",
  "/leaderboard": "Leaderboard | Predictify",
  "/login": "Login | Predictify",
  "/moderation-demo": "Moderation Demo | Predictify",
  "/mypredictions": "My Predictions | Predictify",
  "/profile": "Profile | Predictify",
  "/settings": "Settings | Predictify",
  "/verification": "Verification | Predictify",
};

export function getDocumentTitleForPathname(pathname: string | null | undefined): string {
  const normalizedPathname = normalizePathname(pathname);

  if (ROUTE_TITLES[normalizedPathname]) {
    return ROUTE_TITLES[normalizedPathname];
  }

  const matchingPrefix = Object.keys(ROUTE_TITLES)
    .filter((route) => route !== "/" && normalizedPathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matchingPrefix ? ROUTE_TITLES[matchingPrefix] : APP_TITLE;
}

export function useDocumentTitle(title: string, options: { restoreOnUnmount?: boolean } = {}) {
  const { restoreOnUnmount = true } = options;
  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (originalTitle.current === null) {
      originalTitle.current = document.title;
    }

    document.title = title;

    return () => {
      if (restoreOnUnmount && originalTitle.current !== null) {
        document.title = originalTitle.current;
      }
    };
  }, [restoreOnUnmount, title]);
}

export function RouteDocumentTitle() {
  const pathname = usePathname();
  const title = getDocumentTitleForPathname(pathname);

  useDocumentTitle(title, { restoreOnUnmount: false });

  return null;
}

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) {
    return "/";
  }

  const withoutQuery = pathname.split("?")[0].split("#")[0];
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;

  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : "/";
}
