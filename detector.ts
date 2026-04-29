import { AnomalyAlert, AnomalyThresholds, MetricSnapshot } from "./types";
import { getConfig } from "./app/lib/config";

/**
 * Default thresholds tunable via environment variables.
 * Now sourced from centralized config for validation.
 */
const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  creationBurstLimit: getConfig().anomalyThresholds.creationBurstLimit,
  settleRateLimit: getConfig().anomalyThresholds.settleRateLimit,
};

/**
 * In-memory whitelist for snoozing alerts per tenant during incidents.
 * In production, this should be backed by a distributed cache or DB.
 */
const whitelist = new Set<string>();

/**
 * Rule-based anomaly detection for early fraud/bug mitigation.
 * SECURITY NOTE: These alerts are for observation and manual review. 
 * Do not use for unilateral fund freezing without a compliance policy.
 */
export const AnomalyDetector = {
  evaluate(snapshot: MetricSnapshot, config: AnomalyThresholds = DEFAULT_THRESHOLDS): AnomalyAlert[] {
    if (whitelist.has(snapshot.tenantId)) {
      return [];
    }

    const alerts: AnomalyAlert[] = [];

    // Rule 1: High frequency of new stream creation
    if (snapshot.streamCreations > config.creationBurstLimit) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "STREAM_CREATION_BURST",
        observedValue: snapshot.streamCreations,
        threshold: config.creationBurstLimit,
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }

    // Rule 2: Abnormal settlement activity
    if (snapshot.settleAttempts > config.settleRateLimit) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "SETTLE_RATE_SPIKE",
        observedValue: snapshot.settleAttempts,
        threshold: config.settleRateLimit,
        severity: "medium",
        detectedAt: new Date().toISOString(),
      });
    }

    // Rule 3: High submission failure rate
    const failureRate = snapshot.stellarSubmissionsTotal > 0 
      ? snapshot.stellarSubmissionsFailed / snapshot.stellarSubmissionsTotal 
      : 0;
    if (failureRate > (config.submissionFailureThreshold ?? 0.05)) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "HIGH_SUBMISSION_FAILURE_RATE" as any,
        observedValue: failureRate,
        threshold: config.submissionFailureThreshold ?? 0.05,
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }

    // Rule 4: DLQ Growth
    if (snapshot.dlqDepth > (config.maxDlqDepth ?? 10)) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "DLQ_DEPTH_EXCEEDED" as any,
        observedValue: snapshot.dlqDepth,
        threshold: config.maxDlqDepth ?? 10,
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }

    return alerts;
  },

  setWhitelist(tenantId: string, active: boolean) {
    active ? whitelist.add(tenantId) : whitelist.delete(tenantId);
  }
};