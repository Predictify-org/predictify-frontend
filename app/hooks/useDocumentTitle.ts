"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { announce } from "@/hooks/use-global-live-region";

const APP_TITLE = "Predictify";
const DEFAULT_TITLE = "Predictify - Prediction Platform";

export const ROUTE_TITLES: Record<string, string> = {
  "/": DEFAULT_TITLE,
  "/a11y-audit": "Accessibility Audit | Predictify",
  "/activity-timeline-demo": "Activity Timeline | Predictify",
  "/bets": "Bets | Predictify",
  "/claims": "Claims | Predictify",
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
  "/markets": "Markets | Predictify",
  "/moderation-demo": "Moderation Demo | Predictify",
  "/mypredictions": "My Predictions | Predictify",
  "/profile": "Profile | Predictify",
  "/settings/account": "Account Settings | Predictify",
  "/settings/language": "Language Settings | Predictify",
  "/settings/motion": "Motion Settings | Predictify",
  "/settings/privacy": "Privacy Settings | Predictify",
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

export interface UseDocumentTitleOptions {
  restoreOnUnmount?: boolean;
  announceToSR?: boolean;
}

export function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}) {
  const { restoreOnUnmount = true, announceToSR = false } = options;
  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (originalTitle.current === null) {
      originalTitle.current = document.title;
    }

    document.title = title;

    if (announceToSR) {
      announce({ message: title, priority: "polite" });
    }

    return () => {
      if (restoreOnUnmount && originalTitle.current !== null) {
        document.title = originalTitle.current;
      }
    };
  }, [announceToSR, restoreOnUnmount, title]);
}

export function RouteDocumentTitle() {
  const pathname = usePathname();
  const title = getDocumentTitleForPathname(pathname);

  useDocumentTitle(title, { restoreOnUnmount: false, announceToSR: true });

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
