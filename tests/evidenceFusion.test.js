/**
 * WAYFARER AI - Evidence Fusion & Community Pipeline Test Suite
 * Validates the 4-stage pipeline:
 * 1. Abuse / Spam Detection
 * 2. Duplicate Detection & Clustering
 * 3. Independence Analysis (Sybil vs Organic)
 * 4. Evidence Fusion (8 Factor dimensions)
 * 5. Triage Decisions (WARN, ADAPT, QUARANTINE)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  detectAbuseAndSpam,
  clusterDuplicates,
  analyzeIndependence,
  fuseEvidence,
  processCommunityReport,
  actionIncidentCluster,
  evidenceStore
} from "../server/engine/evidenceFusionEngine.js";

describe("Evidence Fusion & Community Report Pipeline", () => {

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: ABUSE / SPAM DETECTION
  // ─────────────────────────────────────────────────────────────
  describe("Stage 1: Abuse & Spam Detection", () => {
    it("flags high submission velocity from the same IP/user within 60s", () => {
      const recentReports = [
        { reporterId: "user-spammer", ipAddress: "192.168.1.100", timestamp: new Date().toISOString() },
        { reporterId: "user-spammer", ipAddress: "192.168.1.100", timestamp: new Date().toISOString() },
        { reporterId: "user-spammer", ipAddress: "192.168.1.100", timestamp: new Date().toISOString() }
      ];

      const newReport = {
        reporterId: "user-spammer",
        ipAddress: "192.168.1.100",
        description: "Valid looking description but velocity violation",
        resourceId: "S3"
      };

      const result = detectAbuseAndSpam(newReport, recentReports);
      assert.equal(result.isSpam, true);
      assert.ok(result.spamScore >= 0.60);
      assert.ok(result.reasons.some(r => r.includes("Velocity violation")));
    });

    it("flags repetitive nonsense text and known spam keywords", () => {
      const repetitiveReport = {
        reporterId: "user-1",
        description: "Elevator is brokkkkkkkkk broken",
        resourceId: "S3"
      };
      const repResult = detectAbuseAndSpam(repetitiveReport, []);
      assert.ok(repResult.reasons.some(r => r.includes("Repetitive")));

      const keywordSpamReport = {
        reporterId: "user-2",
        description: "Free crypto airdrop click here to claim",
        resourceId: "S3"
      };
      const keyResult = detectAbuseAndSpam(keywordSpamReport, []);
      assert.equal(keyResult.isSpam, true);
      assert.ok(keyResult.reasons.some(r => r.includes("Commercial spam")));
    });

    it("detects invalid coordinates and geographic anomalies", () => {
      const invalidCoordsReport = {
        reporterId: "user-3",
        description: "Broken ramp at platform",
        resourceId: "S3",
        reporterLocation: { lat: 145.0, lng: 200.0 }
      };
      const invResult = detectAbuseAndSpam(invalidCoordsReport, []);
      assert.equal(invResult.isSpam, true);
      assert.ok(invResult.reasons.some(r => r.includes("Invalid geographic coordinates")));

      // 600km away from Mumbai stop-1 (18.9401, 72.8354)
      const distantReport = {
        reporterId: "user-4",
        description: "Platform elevator not working at station",
        resourceId: "stop-1",
        reporterLocation: { lat: 28.6139, lng: 77.2090 } // New Delhi (~1100 km away)
      };
      const distResult = detectAbuseAndSpam(distantReport, []);
      assert.ok(distResult.reasons.some(r => r.includes("Geographic anomaly")));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: DUPLICATE DETECTION & CLUSTERING
  // ─────────────────────────────────────────────────────────────
  describe("Stage 2: Duplicate Detection & Spatial-Temporal Clustering", () => {
    it("clusters reports matching the same resourceId within 60 minutes", () => {
      const existingCluster = {
        id: "cluster-test-1",
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        firstReportedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        lastReportedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        reports: [{ reporterId: "user-A", description: "Elevator down" }],
        status: "WARN"
      };

      const incomingReport = {
        reporterId: "user-B",
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        description: "Can confirm north elevator has mechanical failure",
        timestamp: new Date().toISOString()
      };

      const { cluster, isNewCluster } = clusterDuplicates(incomingReport, [existingCluster]);
      assert.equal(isNewCluster, false);
      assert.equal(cluster.id, "cluster-test-1");
      assert.equal(cluster.reports.length, 2);
    });

    it("creates a new cluster when spatial/temporal thresholds do not match", () => {
      const existingCluster = {
        id: "cluster-test-2",
        resourceId: "stop-1",
        eventType: "TRANSPORT_DELAY",
        firstReportedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        lastReportedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        reports: [{ reporterId: "user-A" }],
        status: "WARN"
      };

      const distantReport = {
        reporterId: "user-C",
        resourceId: "stop-4", // Marine drive, distinct location
        eventType: "CROWD_SURGE",
        description: "Heavy congestion along the promenade",
        timestamp: new Date().toISOString()
      };

      const { cluster, isNewCluster } = clusterDuplicates(distantReport, [existingCluster]);
      assert.equal(isNewCluster, true);
      assert.equal(cluster.resourceId, "stop-4");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: INDEPENDENCE ANALYSIS (SYBIL DETECTION)
  // ─────────────────────────────────────────────────────────────
  describe("Stage 3: Independence Analysis", () => {
    it("detects bot flood collusion (same subnet, identical timestamps & coordinates)", () => {
      const botCluster = {
        reports: [
          { reporterId: "bot-1", ipAddress: "198.51.100.12", reporterLocation: { lat: 18.929000, lng: 72.825000 }, timestamp: new Date(Date.now()).toISOString() },
          { reporterId: "bot-2", ipAddress: "198.51.100.12", reporterLocation: { lat: 18.929000, lng: 72.825000 }, timestamp: new Date(Date.now() + 200).toISOString() },
          { reporterId: "bot-3", ipAddress: "198.51.100.12", reporterLocation: { lat: 18.929000, lng: 72.825000 }, timestamp: new Date(Date.now() + 400).toISOString() }
        ]
      };

      const metrics = analyzeIndependence(botCluster);
      assert.ok(metrics.sybilRiskScore >= 0.50, `Expected high Sybil risk score, got ${metrics.sybilRiskScore}`);
      assert.equal(metrics.uniqueSubnetsCount, 1);
      assert.ok(metrics.independentConfirmationsCount < 3);
    });

    it("confirms genuine independence for distinct staggered human travelers", () => {
      const organicCluster = {
        reports: [
          { reporterId: "user-aditi", ipAddress: "49.36.11.20", reporterLocation: { lat: 18.9290, lng: 72.8251 }, timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
          { reporterId: "user-rahul", ipAddress: "103.45.67.89", reporterLocation: { lat: 18.9293, lng: 72.8254 }, timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { reporterId: "user-priya", ipAddress: "157.34.12.90", reporterLocation: { lat: 18.9288, lng: 72.8248 }, timestamp: new Date(Date.now()).toISOString() }
        ]
      };

      const metrics = analyzeIndependence(organicCluster);
      assert.equal(metrics.uniqueReportersCount, 3);
      assert.equal(metrics.uniqueSubnetsCount, 3);
      assert.equal(metrics.independentConfirmationsCount, 3);
      assert.ok(metrics.sybilRiskScore < 0.20);
      assert.equal(metrics.independenceRatio, 1.0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: EVIDENCE FUSION & TRIAGE DECISION (WARN / ADAPT / QUARANTINE)
  // ─────────────────────────────────────────────────────────────
  describe("Stage 4: 8-Factor Evidence Fusion & Triage Decisions", () => {
    it("triages a single unverified report as WARN with moderate confidence", () => {
      const singleReportCluster = {
        resourceId: "S3",
        reports: [
          {
            reporterId: "user-single",
            reporterReputation: 0.70,
            reporterLocation: { lat: 18.9290, lng: 72.8250 },
            mediaEvidence: { hasPhoto: false },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const independence = {
        independentConfirmationsCount: 1,
        totalReportsCount: 1,
        uniqueReportersCount: 1,
        uniqueSubnetsCount: 1,
        independenceRatio: 1.0,
        sybilRiskScore: 0.10
      };

      const fusion = fuseEvidence(singleReportCluster, independence);
      assert.equal(fusion.scores.decision, "WARN");
      assert.ok(fusion.scores.actionConfidence >= 0.35 && fusion.scores.actionConfidence < 0.70);
      assert.ok(fusion.scores.attackRisk < 0.35);
    });

    it("triages multi-witness report with photo as ADAPT with high confidence", () => {
      const multiWitnessCluster = {
        resourceId: "S3",
        reports: [
          {
            reporterId: "user-1",
            reporterReputation: 0.85,
            reporterLocation: { lat: 18.9290, lng: 72.8250 },
            mediaEvidence: { hasPhoto: true },
            timestamp: new Date().toISOString()
          },
          {
            reporterId: "user-2",
            reporterReputation: 0.80,
            reporterLocation: { lat: 18.9292, lng: 72.8253 },
            mediaEvidence: { hasPhoto: true },
            timestamp: new Date().toISOString()
          },
          {
            reporterId: "user-3",
            reporterReputation: 0.90,
            reporterLocation: { lat: 18.9288, lng: 72.8249 },
            mediaEvidence: { hasPhoto: false },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const independence = {
        independentConfirmationsCount: 3,
        totalReportsCount: 3,
        uniqueReportersCount: 3,
        uniqueSubnetsCount: 3,
        independenceRatio: 1.0,
        sybilRiskScore: 0.05
      };

      const fusion = fuseEvidence(multiWitnessCluster, independence);
      assert.equal(fusion.scores.decision, "ADAPT");
      assert.ok(fusion.scores.actionConfidence >= 0.70);
      assert.ok(fusion.scores.attackRisk < 0.25);
    });

    it("triages adversarial / spam reports into QUARANTINE", () => {
      const spamReport = {
        reporterId: "adversary-bot",
        resourceId: "S3",
        eventType: "SAFETY_HAZARD",
        description: "aaaaaa free casino win money now",
        ipAddress: "198.51.100.99"
      };

      const res = processCommunityReport(spamReport);
      assert.equal(res.decision, "QUARANTINE");
      assert.equal(res.report.isSpam, true);
    });

    it("handles operator override actions (CONFIRM_ADAPT, REJECT_QUARANTINE)", () => {
      const report = {
        reporterId: "traveler-test-override",
        resourceId: "S2",
        eventType: "TEMPORARILY_CLOSED",
        description: "Gate under repair at Gateway courtyard",
        reporterReputation: 0.6
      };

      const { cluster } = processCommunityReport(report);
      
      // Verified authority confirms
      const confirmed = actionIncidentCluster(cluster.id, "CONFIRM_ADAPT", "Verified by site manager", "Supervisor");
      assert.ok(confirmed.status === "ACTIVE" || confirmed.status === "ADAPT");
      assert.equal(confirmed.decision, "ADAPT");
      assert.equal(confirmed.scores.actionConfidence, 1.0);
      assert.equal(confirmed.officialAuthorityVerified, true);

      // Rejection / Quarantine
      const quarantined = actionIncidentCluster(cluster.id, "REJECT_QUARANTINE", "False alarm", "Supervisor");
      assert.ok(quarantined.status === "QUARANTINED" || quarantined.status === "QUARANTINE");
      assert.equal(quarantined.decision, "QUARANTINE");
    });
  });
});
