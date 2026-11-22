'use client';

import React, { useState, useCallback, useId } from 'react';
import { Flag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REPORT_REASONS,
  isValidReportReason,
} from './report-taxonomy';
import type { ReportReasonCode } from '@/types/moderation';

export interface ReportMarketDialogProps {
  marketId: string;
  marketTitle?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReportSubmitted?: (reportId: string) => void;
}

const MAX_DETAILS_LENGTH = 1000;

function isValidHttpUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed.length > 2048) return false;

  const lower = trimmed.toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'file:', 'blob:', 'vbscript:'];
  if (dangerousProtocols.some((proto) => lower.startsWith(proto))) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    return (protocol === 'http:' || protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function ReportMarketDialog({
  marketId,
  marketTitle,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onReportSubmitted,
}: ReportMarketDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      setControlledOpen?.(newOpen);

      // Reset state when dialog closes
      if (!newOpen) {
        setReason('');
        setDetails('');
        setEvidenceUrl('');
        setErrors({});
        setSubmitError(null);
        setSuccessReportId(null);
        setIsSubmitting(false);
      }
    },
    [isControlled, setControlledOpen]
  );

  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [errors, setErrors] = useState<{
    reason?: string;
    details?: string;
    evidenceUrl?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);

  const reasonId = useId();
  const detailsId = useId();
  const evidenceId = useId();

  const validateForm = (): boolean => {
    const newErrors: {
      reason?: string;
      details?: string;
      evidenceUrl?: string;
    } = {};

    if (!reason || !isValidReportReason(reason)) {
      newErrors.reason = 'Please select a reason for reporting this market';
    }

    if (details.length > MAX_DETAILS_LENGTH) {
      newErrors.details = `Details must not exceed ${MAX_DETAILS_LENGTH} characters`;
    }

    if (evidenceUrl.trim() && !isValidHttpUrl(evidenceUrl.trim())) {
      newErrors.evidenceUrl = 'Evidence URL must be a valid http or https URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submissions
    if (isSubmitting) return;

    setSubmitError(null);

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketId,
          reason: reason as ReportReasonCode,
          details: details.trim() || undefined,
          evidenceUrl: evidenceUrl.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 202) {
        const id = data.reportId || 'submitted';
        setSuccessReportId(id);
        onReportSubmitted?.(id);
      } else if (response.status === 429) {
        setSubmitError(
          data.error || 'Too many reports submitted. Please wait before trying again.'
        );
      } else {
        setSubmitError(
          data.error || 'Failed to submit report. Please check your input and try again.'
        );
      }
    } catch {
      setSubmitError('Network error: Unable to submit report. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReasonObj = REPORT_REASONS.find((r) => r.code === reason);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Report market"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span>Report Market</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-md"
        aria-describedby="report-market-description"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" aria-hidden="true" />
            Report Market
          </DialogTitle>
          <DialogDescription id="report-market-description">
            {marketTitle
              ? `Submit a report for "${marketTitle}". Reports are reviewed by community moderators.`
              : 'Submit a report for this market. Reports are reviewed by community moderators.'}
          </DialogDescription>
        </DialogHeader>

        {successReportId ? (
          <div className="space-y-4 py-2" role="status" aria-live="polite">
            <Alert className="border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950/20 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              <AlertTitle className="font-semibold">Report Submitted</AlertTitle>
              <AlertDescription className="mt-1 text-sm space-y-1">
                <p>
                  Thank you for helping keep Predictify safe. Our moderation team has received your report.
                </p>
                <p className="text-xs opacity-90 font-mono pt-1">
                  Reference ID: <span className="font-semibold">{successReportId}</span>
                </p>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {submitError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="text-sm">{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Reason Select */}
            <div className="space-y-1.5">
              <Label htmlFor={reasonId} className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select
                value={reason}
                onValueChange={(val) => {
                  setReason(val);
                  if (errors.reason) {
                    setErrors((prev) => ({ ...prev, reason: undefined }));
                  }
                }}
              >
                <SelectTrigger
                  id={reasonId}
                  aria-required="true"
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={errors.reason ? `${reasonId}-error` : undefined}
                  className={errors.reason ? 'border-destructive focus-visible:ring-destructive' : ''}
                >
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      <span className="font-medium">{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReasonObj && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedReasonObj.helpText}
                </p>
              )}
              {errors.reason && (
                <p id={`${reasonId}-error`} role="alert" className="text-xs text-destructive">
                  {errors.reason}
                </p>
              )}
            </div>

            {/* Details Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={detailsId} className="text-sm font-medium">
                  Description / Details
                </Label>
                <span
                  className={`text-xs ${
                    details.length > MAX_DETAILS_LENGTH
                      ? 'text-destructive font-semibold'
                      : 'text-muted-foreground'
                  }`}
                  aria-live="polite"
                >
                  {details.length} / {MAX_DETAILS_LENGTH}
                </span>
              </div>
              <Textarea
                id={detailsId}
                placeholder="Provide details or context regarding why this market violates guidelines..."
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  if (errors.details && e.target.value.length <= MAX_DETAILS_LENGTH) {
                    setErrors((prev) => ({ ...prev, details: undefined }));
                  }
                }}
                disabled={isSubmitting}
                rows={4}
                aria-invalid={Boolean(errors.details)}
                aria-describedby={errors.details ? `${detailsId}-error` : undefined}
                className={errors.details ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.details && (
                <p id={`${detailsId}-error`} role="alert" className="text-xs text-destructive">
                  {errors.details}
                </p>
              )}
            </div>

            {/* Evidence URL */}
            <div className="space-y-1.5">
              <Label htmlFor={evidenceId} className="text-sm font-medium">
                Evidence URL <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id={evidenceId}
                type="url"
                placeholder="https://example.com/evidence"
                value={evidenceUrl}
                onChange={(e) => {
                  setEvidenceUrl(e.target.value);
                  if (errors.evidenceUrl) {
                    setErrors((prev) => ({ ...prev, evidenceUrl: undefined }));
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.evidenceUrl)}
                aria-describedby={errors.evidenceUrl ? `${evidenceId}-error` : undefined}
                className={errors.evidenceUrl ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Optional link to evidence supporting your report (must start with http:// or https://).
              </p>
              {errors.evidenceUrl && (
                <p id={`${evidenceId}-error`} role="alert" className="text-xs text-destructive">
                  {errors.evidenceUrl}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
