import { describe, it } from "node:test";
import assert from "node:assert";
import {
  determineIncidentLifecycleStatus,
  processCommunityReport,
  actionIncidentCluster,
  fuseEvidence
} from "../server/engine/evidenceFusionEngine.js";

describe("Incident Lifecycle State Machine Tests (Phase 2)", () => {
  it("transitions single uncorroborated report to UNVERIFIED with WARN decision", () => {
    const cluster = {
      id: "test-single",
      status: "UNVERIFIED",
      reports: [
        {
          id: "rep-1",
          reporterId: "user-1",
          reporterReputation: 0.5,
          timestamp: new Date().toISOString()
        }
      ]
    };
    const independence = { independentConfirmationsCount: 1, sybilRiskScore: 0.1 };
    const fusion = {
      scores: {
        communityConfidence: 0.45,
        attackRisk: 0.1,
        actionConfidence: 0.40,
        decision: "WARN"
      }
    };

    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);
    assert.strictEqual(status, "UNVERIFIED");
    assert.strictEqual(fusion.scores.decision, "WARN");
  });

  it("transitions multi-witness reports to CORROBORATING with WARN decision", () => {
    const cluster = {
      id: "test-corroborating",
      reports: [
        { id: "rep-1", reporterId: "user-1", timestamp: new Date().toISOString() },
        { id: "rep-2", reporterId: "user-2", timestamp: new Date().toISOString() }
      ]
    };
    const independence = { independentConfirmationsCount: 2, sybilRiskScore: 0.1 };
    const fusion = {
      scores: {
        communityConfidence: 0.65,
        attackRisk: 0.1,
        actionConfidence: 0.60,
        decision: "WARN"
      }
    };

    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);
    assert.strictEqual(status, "CORROBORATING");
    assert.strictEqual(fusion.scores.decision, "WARN");
  });

  it("separates status: VERIFIED from decision: WARN when confidence is high but below adaptation threshold", () => {
    const cluster = {
      id: "test-verified-warn",
      reports: [
        { id: "rep-1", reporterId: "user-1", timestamp: new Date().toISOString() },
        { id: "rep-2", reporterId: "user-2", timestamp: new Date().toISOString() },
        { id: "rep-3", reporterId: "user-3", timestamp: new Date().toISOString() }
      ]
    };
    const independence = { independentConfirmationsCount: 3, sybilRiskScore: 0.1 };
    const fusion = {
      scores: {
        communityConfidence: 0.82,
        attackRisk: 0.20,
        actionConfidence: 0.68, // just below 0.70 adaptation threshold
        decision: "WARN"
      }
    };

    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);
    assert.strictEqual(status, "VERIFIED");
    assert.strictEqual(fusion.scores.decision, "WARN");
  });

  it("transitions to status: ACTIVE when decision is ADAPT", () => {
    const cluster = {
      id: "test-active-adapt",
      reports: [
        { id: "rep-1", reporterId: "user-1", timestamp: new Date().toISOString() },
        { id: "rep-2", reporterId: "user-2", timestamp: new Date().toISOString() },
        { id: "rep-3", reporterId: "user-3", timestamp: new Date().toISOString() }
      ]
    };
    const independence = { independentConfirmationsCount: 3, sybilRiskScore: 0.05 };
    const fusion = {
      scores: {
        communityConfidence: 0.90,
        attackRisk: 0.08,
        actionConfidence: 0.85,
        decision: "ADAPT"
      }
    };

    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);
    assert.strictEqual(status, "ACTIVE");
    assert.strictEqual(fusion.scores.decision, "ADAPT");
  });

  it("marks coordinated attacks and spam as QUARANTINED in suspicious branch", () => {
    const cluster = {
      id: "test-attack",
      reports: [
        { id: "rep-bot-1", reporterId: "bot", timestamp: new Date().toISOString() }
      ]
    };
    const independence = { independentConfirmationsCount: 0, sybilRiskScore: 0.95 };
    const fusion = {
      scores: {
        communityConfidence: 0.10,
        attackRisk: 0.92,
        actionConfidence: 0.02,
        decision: "QUARANTINE"
      }
    };

    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);
    assert.strictEqual(status, "QUARANTINED");
    assert.strictEqual(fusion.scores.decision, "QUARANTINE");
  });

  it("marks aged reports (>90 min without fresh confirmation) as STALE", () => {
    const ninetyFiveMinutesAgo = new Date(Date.now() - 95 * 60 * 1000).toISOString();
    const staleCluster = {
      id: "test-stale",
      lastReportedAt: ninetyFiveMinutesAgo,
      reports: [
        { id: "rep-old", reporterId: "user-old", timestamp: ninetyFiveMinutesAgo }
      ]
    };
    const independence = { independentConfirmationsCount: 2, sybilRiskScore: 0.1 };
    const fusion = {
      scores: {
        communityConfidence: 0.70,
        attackRisk: 0.1,
        actionConfidence: 0.65,
        decision: "WARN"
      }
    };

    const status = determineIncidentLifecycleStatus(staleCluster, independence, fusion);
    assert.strictEqual(status, "STALE");
  });

  it("marks resolved reports as RESOLVED", () => {
    const resolvedCluster = {
      id: "test-resolved",
      status: "RESOLVED",
      reports: []
    };
    const independence = { independentConfirmationsCount: 2, sybilRiskScore: 0.1 };
    const fusion = {
      scores: {
        communityConfidence: 0.70,
        attackRisk: 0.1,
        actionConfidence: 0.65,
        decision: "WARN"
      }
    };

    const status = determineIncidentLifecycleStatus(resolvedCluster, independence, fusion);
    assert.strictEqual(status, "RESOLVED");
  });

  it("processCommunityReport populates both lifecycle status and decision fields", () => {
    const reportInput = {
      reporterId: "lifecycle-tester",
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Tactile paving missing on platform approach",
      severity: 0.7
    };

    const result = processCommunityReport(reportInput);
    assert.ok(result.cluster);
    assert.ok(["UNVERIFIED", "CORROBORATING", "VERIFIED", "ACTIVE", "QUARANTINED"].includes(result.cluster.status));
    assert.ok(["WARN", "ADAPT", "QUARANTINE"].includes(result.cluster.decision));
    assert.strictEqual(result.status, result.cluster.status);
    assert.strictEqual(result.decision, result.cluster.decision);
  });
});
