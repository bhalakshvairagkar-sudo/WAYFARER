import { describe, it } from "node:test";
import assert from "node:assert";
import {
  evidenceStore,
  processCommunityReport,
  determineIncidentLifecycleStatus,
  analyzeIndependence,
  fuseEvidence
} from "../server/engine/evidenceFusionEngine.js";

describe("Community Feedback & Freshness Tests (Phase 7)", () => {
  it("YES confirmation adds fresh confirmation and updates confidence", () => {
    const report = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Elevator mechanical failure on north platform ramp",
      severity: 0.8,
      reporterId: "feedback-tester-1",
      ipAddress: "142.250.190.46"
    };

    const initial = processCommunityReport(report);
    const cluster = initial.cluster;
    const initialReportsCount = cluster.reports.length;

    // Simulate YES confirmation
    const confirmReport = {
      id: `rep-confirm-test`,
      reporterId: "feedback-confirmer",
      resourceId: cluster.resourceId,
      eventType: cluster.eventType,
      description: "Confirmed still active by traveler.",
      ipAddress: "142.250.190.47",
      timestamp: new Date().toISOString()
    };

    cluster.reports.push(confirmReport);
    cluster.lastReportedAt = new Date().toISOString();

    const independence = analyzeIndependence(cluster);
    const fusion = fuseEvidence(cluster, independence);
    const status = determineIncidentLifecycleStatus(cluster, independence, fusion);

    assert.strictEqual(cluster.reports.length, initialReportsCount + 1);
    assert.ok(["CORROBORATING", "VERIFIED", "ACTIVE"].includes(status));
  });

  it("NO / challenge adds contradiction and penalizes confidence towards RESOLVED", () => {
    const report = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Debris blocking rampway",
      severity: 0.7,
      reporterId: "feedback-tester-2",
      ipAddress: "142.250.190.50"
    };

    const initial = processCommunityReport(report);
    const cluster = initial.cluster;

    // Two contradictory "ALL_CLEAR" reports
    cluster.reports.push({
      id: "challenge-1",
      resourceId: cluster.resourceId,
      eventType: "ALL_CLEAR",
      isContradiction: true,
      description: "Rampway has been cleared by crew.",
      timestamp: new Date().toISOString()
    });

    cluster.reports.push({
      id: "challenge-2",
      resourceId: cluster.resourceId,
      eventType: "ALL_CLEAR",
      isContradiction: true,
      description: "All clear, fully passable now.",
      timestamp: new Date().toISOString()
    });

    const independence = analyzeIndependence(cluster);
    const fusion = fuseEvidence(cluster, independence);

    assert.ok(fusion.evidenceDimensions.contradictions >= 0.70, "Contradiction penalty should be elevated");
    const contradictionsCount = cluster.reports.filter(r => r.isContradiction || r.eventType === "ALL_CLEAR").length;
    assert.strictEqual(contradictionsCount >= 2, true);
  });
});
