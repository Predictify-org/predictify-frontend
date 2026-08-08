"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { LeaderboardTableErrorFallback } from "./LeaderboardTableErrorFallback";
import { LeaderboardTable } from "./LeaderboardTable";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  incidentId: string | null;
}

/**
 * Error boundary dedicated to the LeaderboardTable. Catches render errors
 * thrown by the table (or its virtualizer) and swaps in a polished,
 * leaderboard-themed fallback with a Retry action, instead of a blank screen.
 *
 * Unlike the generic `ErrorBoundary`, this one passes the actual error and
 * incident id to the themed fallback so users/reviewers can see a useful
 * message in development.
 */
export class LeaderboardTableErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, incidentId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const incidentId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.random().toString(36).substring(2, 15)}${Math.random()
            .toString(36)
            .substring(2, 15)}`;

    return { hasError: true, error, incidentId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const incidentId = this.state.incidentId ?? "unknown";
    console.error(
      `Error caught by LeaderboardTableErrorBoundary [Incident: ${incidentId}]:`,
      error,
      errorInfo
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, incidentId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <LeaderboardTableErrorFallback
          error={this.state.error ?? new Error("Unknown error")}
          incidentId={this.state.incidentId ?? "unknown"}
          resetErrorBoundary={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Convenience wrapper that renders the LeaderboardTable inside the themed
 * error boundary. Import this in pages whenever you want the fallback UI.
 */
export function LeaderboardTableWithBoundary({
  users,
  onUserVisibilityChange,
  onShare,
}: {
  users: LeaderboardUser[];
  onUserVisibilityChange?: (isVisible: boolean) => void;
  onShare?: () => void;
}) {
  return (
    <LeaderboardTableErrorBoundary>
      <LeaderboardTable
        users={users}
        onUserVisibilityChange={onUserVisibilityChange}
        onShare={onShare}
      />
    </LeaderboardTableErrorBoundary>
  );
}

export { LeaderboardTable } from "./LeaderboardTable";