"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, MessageSquare } from "lucide-react";
import { CopyableText } from "@/components/ui/CopyableText";

interface ErrorRecoveryScreenProps {
  error: Error;
  incidentId: string;
  resetErrorBoundary: () => void;
}

export function ErrorRecoveryScreen({ error, incidentId, resetErrorBoundary }: ErrorRecoveryScreenProps) {
  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleReportIssue = () => {
    window.location.href = "/help";
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 dark:bg-destructive/20">
        <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Oops, something went wrong</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        We encountered an unexpected issue while loading this page. Our team has been notified. Let's get you back on track.
      </p>

      <div className="mb-8 flex flex-col items-center gap-2 rounded-lg bg-muted p-4 sm:flex-row">
        <span className="text-sm font-medium text-muted-foreground">Incident ID:</span>
        <CopyableText 
          text={incidentId} 
          truncateMiddle={false} 
          className="rounded bg-background px-2 py-1" 
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={resetErrorBoundary} size="lg" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
        <Button onClick={handleGoHome} variant="outline" size="lg" className="gap-2">
          <Home className="h-4 w-4" />
          Go Home
        </Button>
        <Button onClick={handleReportIssue} variant="secondary" size="lg" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Report Issue
        </Button>
      </div>
    </div>
  );
}
