"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorRecoveryScreen } from "@/components/error/ErrorRecoveryScreen";
import { reportError } from "@/lib/error-reporting";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  incidentId: string | null;
}

/**
 * Error Boundary component for catching React errors
 * Provides a user-friendly error UI instead of a blank screen
 */
export class ErrorBoundary extends Component<Props, State> {
  private lastReportedIncidentId: string | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, incidentId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const incidentId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
    return { hasError: true, error, incidentId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const incidentId = this.state.incidentId || "unknown";
    if (this.lastReportedIncidentId === incidentId) {
      return;
    }
    this.lastReportedIncidentId = incidentId;

    const route =
      typeof window !== "undefined" ? window.location.pathname : undefined;

    reportError({
      error,
      componentStack: errorInfo.componentStack,
      incidentId,
      route,
    });
  }

  handleReset = () => {
    this.lastReportedIncidentId = null;
    this.setState({ hasError: false, error: null, incidentId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorRecoveryScreen 
          error={this.state.error!} 
          incidentId={this.state.incidentId || "unknown"} 
          resetErrorBoundary={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

