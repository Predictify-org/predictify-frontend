import { AnomalyDetector } from "./detector";
import { MetricSnapshot } from "./types";

describe("AnomalyDetector", () => {
  const tenantId = "tenant_test_1";
  const thresholds = { 
    creationBurstLimit: 10, 
    settleRateLimit: 5,
    submissionFailureThreshold: 0.05,
    maxDlqDepth: 10
  };

  const createSnapshot = (
    creations: number, 
    settles: number, 
    submissionsTotal = 0, 
    submissionsFailed = 0, 
    dlqDepth = 0
  ): MetricSnapshot => ({
    tenantId,
    streamCreations: creations,
    settleAttempts: settles,
    stellarSubmissionsTotal: submissionsTotal,
    stellarSubmissionsFailed: submissionsFailed,
    oldestPendingJobSeconds: 0,
    dlqDepth: dlqDepth,
    p95SettlementLatencySeconds: 0,
    timestamp: Date.now(),
  });

  it("passes under normal load", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 2, 100, 2, 0), thresholds);
    expect(alerts).toHaveLength(0);
  });

  it("detects stream creation bursts", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(15, 2), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("STREAM_CREATION_BURST");
    expect(alerts[0].observedValue).toBe(15);
  });

  it("detects settle rate spikes", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 10), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("SETTLE_RATE_SPIKE");
  });

  it("detects high submission failure rate", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 2, 100, 10, 0), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("HIGH_SUBMISSION_FAILURE_RATE");
    expect(alerts[0].observedValue).toBe(0.1);
  });

  it("detects DLQ depth exceeded", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(5, 2, 100, 2, 15), thresholds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleName).toBe("DLQ_DEPTH_EXCEEDED");
    expect(alerts[0].observedValue).toBe(15);
  });

  it("detects multiple anomalies simultaneously", () => {
    const alerts = AnomalyDetector.evaluate(createSnapshot(20, 20, 100, 20, 20), thresholds);
    expect(alerts).toHaveLength(4);
  });

  it("respects the whitelist/snooze mechanism", () => {
    AnomalyDetector.setWhitelist(tenantId, true);
    const alerts = AnomalyDetector.evaluate(createSnapshot(100, 100, 100, 50, 50), thresholds);
    expect(alerts).toHaveLength(0);
    
    // Cleanup
    AnomalyDetector.setWhitelist(tenantId, false);
  });
});