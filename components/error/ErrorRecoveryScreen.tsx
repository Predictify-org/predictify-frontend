"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Copy, RefreshCw, Home, MessageSquare, Check } from "lucide-react";

interface ErrorRecoveryScreenProps {
  error: Error;
  incidentId: string;
  resetErrorBoundary: () => void;
}

export function ErrorRecoveryScreen({ error, incidentId, resetErrorBoundary }: ErrorRecoveryScreenProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(incidentId);
      setCopied(true);
      toast({
        title: "Incident ID Copied",
        description: "The ID has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy the ID.",
        variant: "destructive",
      });
    }
  };

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
        <code className="rounded bg-background px-2 py-1 text-sm font-mono">{incidentId}</code>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2 h-8 px-2" 
          onClick={handleCopyId}
          aria-label="Copy Incident ID"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
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
