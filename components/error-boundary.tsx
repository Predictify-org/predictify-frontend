"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorRecoveryScreen } from "@/components/error/ErrorRecoveryScreen";

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
    const incidentId = this.state.incidentId;
    // Log error to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      console.error(`Error caught by boundary [Incident: ${incidentId}]:`, error, errorInfo);
      // TODO: Send to error reporting service (e.g., Sentry) with incidentId
    } else {
      console.error(`Error caught by boundary [Incident: ${incidentId}]:`, error, errorInfo);
    }
  }

  handleReset = () => {
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

