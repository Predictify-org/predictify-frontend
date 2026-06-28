import { AnomalyAlert, AnomalyThresholds, MetricSnapshot } from "./types";
import { getConfig } from "./app/lib/config";
import { auditLogStore } from "./app/lib/audit-log";

/**
 * Default thresholds tunable via environment variables.
 * Now sourced from centralized config for validation.
 */
const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  creationBurstLimit: getConfig().anomalyThresholds.creationBurstLimit,
  settleRateLimit: getConfig().anomalyThresholds.settleRateLimit,
  cancelBurstLimit: getConfig().anomalyThresholds.cancelBurstLimit,
};

/**
 * In-memory store for cancellation timestamps per tenant to support moving-window heuristic.
 * Maps tenantId to an array of timestamps (in milliseconds).
 */
const cancelTimestamps = new Map<string, number[]>();

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
    const total = snapshot.stellarSubmissionsTotal ?? 0;
    const failed = snapshot.stellarSubmissionsFailed ?? 0;
    const failureRate = total > 0 ? failed / total : 0;
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
    const dlq = snapshot.dlqDepth ?? 0;
    if (dlq > (config.maxDlqDepth ?? 10)) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "DLQ_DEPTH_EXCEEDED" as any,
        observedValue: dlq,
        threshold: config.maxDlqDepth ?? 10,
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }

    // Rule 5: Stream cancel burst (moving window)
    const now = snapshot.timestamp || Date.now();
    const cancelLimit = config.cancelBurstLimit ?? 5;
    
    if (snapshot.streamCancels && snapshot.streamCancels > 0) {
      let times = cancelTimestamps.get(snapshot.tenantId) || [];
      for (let i = 0; i < snapshot.streamCancels; i++) {
        times.push(now);
      }
      cancelTimestamps.set(snapshot.tenantId, times);
    }

    let times = cancelTimestamps.get(snapshot.tenantId) || [];
    const oneMinuteAgo = now - 60 * 1000;
    times = times.filter(t => t > oneMinuteAgo);
    
    if (times.length > 0) {
      cancelTimestamps.set(snapshot.tenantId, times);
    } else {
      cancelTimestamps.delete(snapshot.tenantId);
    }

    if (times.length > cancelLimit) {
      alerts.push({
        tenantId: snapshot.tenantId,
        ruleName: "STREAM_CANCEL_BURST",
        observedValue: times.length,
        threshold: cancelLimit,
        severity: "high",
        detectedAt: new Date(now).toISOString(),
      });

      // Write to audit log
      auditLogStore.append({
        action: "security.anomaly.cancel_burst",
        actor: { id: "system:detector", role: "system" },
        target: { id: snapshot.tenantId, type: "account" },
        requestId: `detector-${snapshot.tenantId}-${now}`,
        metadata: {
          observedValue: times.length,
          threshold: cancelLimit,
          windowMs: 60000,
        },
      });
    }

    return alerts;
  },

  setWhitelist(tenantId: string, active: boolean) {
    active ? whitelist.add(tenantId) : whitelist.delete(tenantId);
  },

  resetCancelHistory() {
    cancelTimestamps.clear();
  }
};