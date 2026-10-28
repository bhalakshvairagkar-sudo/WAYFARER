/**
 * WAYFARER AI - Phase 4 TrustShield & Verified Community Reporting Test Suite
 * 
 * Verifies P0 Exit Criteria:
 * 1. Duplicate submissions do NOT inflate confidence (independence analysis strictly enforces unique witnesses).
 * 2. Expired incidents stop influencing new route decisions (time-bounded validity per incident type).
 * 3. A disputed report follows a moderator review policy (user flagging sets DISPUTED; moderator reviews).
 * 4. A verified closure can be matched to the affected route (adapts journey via alternative route).
 * 5. Unverified reports do NOT automatically create authoritative road closures (advisory only until corroborated).
 * 6. Clear separation between evidence confidence, verification status, severity, time validity, and geographic scope.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  processCommunityReport,
  analyzeIndependence,
  fuseEvidence,
  determineIncidentLifecycleStatus,
  flagIncidentCluster,
  reviewIncidentCluster,
  getIncidentExpiry,
  INCIDENT_EXPIRY_POLICIES,
  evidenceStore
} from "../server/engine/evidenceFusionEngine.js";
import {
  buildIncidentDecision,
  calculatePersonalImpact,
  applyIncidentToJourney
} from "../server/engine/eventEngine.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from "../server/data/defaultJourney.js";

describe("Phase 4 — TrustShield & Verified Community Reporting Test Suite", () => {
  let baselineJourney;

  beforeEach(() => {
    // Reset evidence store to clean state
    evidenceStore.clusters.clear();
    evidenceStore.reports = [];

    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    baselineJourney = {
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments
    };
  });

  // ─── 1. DUPLICATE SUBMISSIONS DO NOT INFLATE CONFIDENCE ───
  it("1. Duplicate submissions from the same user or IP do NOT inflate confidence", () => {
    const report1 = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "North ramp elevator out of service",
      severity: 0.8,
      reporterId: "user-alice-101",
      ipAddress: "192.168.1.50"
    };

    const res1 = processCommunityReport(report1);
    const initialConf = res1.cluster.scores.communityConfidence;
    const initialIndependentCount = res1.cluster.independenceAnalysis.independentConfirmationsCount;

    assert.equal(initialIndependentCount, 1);

    // Duplicate submission from the same user
    const report2Duplicate = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Still broken elevator north ramp",
      severity: 0.8,
      reporterId: "user-alice-101", // SAME REPORTER
      ipAddress: "192.168.1.50"      // SAME IP
    };

    const res2 = processCommunityReport(report2Duplicate);
    const duplicateConf = res2.cluster.scores.communityConfidence;
    const duplicateIndependentCount = res2.cluster.independenceAnalysis.independentConfirmationsCount;

    // Independent confirmations count must NOT have increased!
    assert.equal(duplicateIndependentCount, 1, "Duplicate report must not increase independent confirmations count");
    assert.ok(duplicateConf <= initialConf, "Duplicate submissions must not inflate community confidence");
  });

  // ─── 2. EXPIRED INCIDENTS STOP INFLUENCING NEW ROUTE DECISIONS ───
  it("2. Expired incidents stop influencing new route decisions based on type policy", () => {
    // Check type-specific expiry policy
    const delayPolicy = INCIDENT_EXPIRY_POLICIES["TRANSPORT_DELAY"];
    assert.equal(delayPolicy.maxDurationMinutes, 60);

    const accessPolicy = INCIDENT_EXPIRY_POLICIES["ACCESSIBILITY_ISSUE"];
    assert.equal(accessPolicy.maxDurationMinutes, 360);

    // Incident created 70 minutes ago for TRANSPORT_DELAY (expiry is 60m)
    const seventyMinutesAgo = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    const expiredCluster = {
      id: "cluster-expired-delay",
      resourceId: "S1",
      eventType: "TRANSPORT_DELAY",
      title: "Bus congestion on S1",
      status: "ACTIVE",
      firstReportedAt: seventyMinutesAgo,
      lastReportedAt: seventyMinutesAgo,
      scores: {
        communityConfidence: 0.85,
        attackRisk: 0.05,
        actionConfidence: 0.82,
        decision: "ADAPT"
      },
      reports: [{ id: "rep-old", reporterId: "u1", timestamp: seventyMinutesAgo }]
    };

    const status = determineIncidentLifecycleStatus(expiredCluster, { independentConfirmationsCount: 2 }, { scores: expiredCluster.scores });
    assert.equal(status, "EXPIRED", "Incident older than type policy must transition to EXPIRED");

    expiredCluster.status = "EXPIRED";
    const decision = buildIncidentDecision(expiredCluster);
    assert.equal(decision.status, "EXPIRED");

    // Route decision engine must ignore expired incidents
    const adaptationResult = applyIncidentToJourney(baselineJourney, decision, DEFAULT_TRAVELER);
    assert.equal(adaptationResult.adapted, false, "Expired incident must NOT adapt the route");
    assert.equal(adaptationResult.reason, "INCIDENT_EXPIRED_OR_RESOLVED");
    assert.equal(adaptationResult.routeChanged, false);
  });

  // ─── 3. A DISPUTED REPORT FOLLOWS A MODERATOR REVIEW POLICY ───
  it("3. A disputed report follows review policy: flagging downgrades confidence and moderator arbitrates", () => {
    // Create an active incident
    const seedReport = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Ramp blocked by debris",
      severity: 0.7,
      reporterId: "traveler-1",
      ipAddress: "14.139.1.10"
    };
    const { cluster } = processCommunityReport(seedReport);
    evidenceStore.saveCluster(cluster);

    // 1. User flags the report as inaccurate
    const flaggedCluster = flagIncidentCluster(cluster.id, {
      reason: "Ramp was cleared 10 minutes ago, path is completely unobstructed",
      flagType: "OUTDATED",
      reporterId: "traveler-verifier-2"
    });

    assert.equal(flaggedCluster.status, "DISPUTED");
    assert.equal(flaggedCluster.verificationStatus, "DISPUTED");
    assert.equal(flaggedCluster.disputeDetails.disputed, true);
    assert.equal(flaggedCluster.disputeDetails.reviewPolicy, "REQUIRES_MODERATOR_TRIAGE");
    assert.equal(flaggedCluster.decision, "WARN", "Disputed report must not remain in ADAPT");

    // When evaluated against journey, disputed report cannot trigger route mutation
    const disputedDecision = buildIncidentDecision(flaggedCluster);
    const adaptationDuringDispute = applyIncidentToJourney(baselineJourney, disputedDecision, DEFAULT_TRAVELER);
    assert.equal(adaptationDuringDispute.adapted, false, "Disputed incident must NOT adapt routes");
    assert.equal(adaptationDuringDispute.reason, "DISPUTED_INCIDENT_UNDER_REVIEW");

    // 2. Moderator reviews and approves / confirms or resolves
    const reviewedCluster = reviewIncidentCluster(cluster.id, {
      decision: "MARK_RESOLVED",
      moderatorNotes: "Site inspection confirmed ramp is clear. Closing incident.",
      moderatorRole: "CONTROLLER",
      moderatorUser: "Inspector Deshmukh"
    });

    assert.equal(reviewedCluster.status, "RESOLVED");
    assert.equal(reviewedCluster.verificationStatus, "RESOLVED");
    assert.equal(reviewedCluster.disputeDetails.reviewPolicy, "RESOLVED_CLOSED");
  });

  // ─── 4. A VERIFIED CLOSURE CAN BE MATCHED TO THE AFFECTED ROUTE ───
  it("4. A verified closure matches the affected route segment and reroutes traveler to safe alternative", () => {
    // Verified authoritative closure on Corridor S3
    const verifiedClosureCluster = {
      id: "cluster-verified-closure-s3",
      resourceId: "S3",
      resourceName: "Colaba → Marine Drive Corridor",
      eventType: "TEMPORARILY_CLOSED",
      title: "Corridor S3 Sea Wall Promenade Closed",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      officialAuthorityVerified: true,
      decision: "ADAPT",
      severity: 1.0,
      scores: {
        communityConfidence: 0.98,
        attackRisk: 0.02,
        actionConfidence: 1.0,
        decision: "ADAPT"
      },
      reports: [
        {
          id: "rep-auth-1",
          reporterId: "mumbai-traffic-police",
          reporterName: "Inspector Vikram Salunkhe",
          reporterReputation: 1.0,
          severity: 1.0,
          description: "Full temporary closure of seawall promenade due to high tide surge."
        }
      ]
    };

    const decision = buildIncidentDecision(verifiedClosureCluster);
    assert.equal(decision.verificationStatus, "VERIFIED");
    assert.equal(decision.decision, "ADAPT");
    assert.deepEqual(decision.affectedSegments, ["S3"]);

    // Apply to wheelchair traveler journey
    const adaptationResult = applyIncidentToJourney(baselineJourney, decision, DEFAULT_TRAVELER);
    assert.equal(adaptationResult.adapted, true, "Verified authoritative closure must adapt journey");
    assert.equal(adaptationResult.affectedSegment.id, "S3");
    assert.notEqual(adaptationResult.newRecommendedId, null);
    assert.ok(adaptationResult.routeChanged, "Recommended route must have changed to safe alternative");
  });

  // ─── 5. UNVERIFIED REPORTS DO NOT CREATE AUTHORITATIVE ROAD CLOSURES ───
  it("5. Unverified reports do NOT automatically create authoritative road closures (advisory only)", () => {
    // Single citizen report claiming closure
    const citizenReport = {
      resourceId: "S3",
      eventType: "TEMPORARILY_CLOSED",
      description: "Gate seems closed at promenade entry",
      severity: 0.9,
      reporterId: "first-time-tourist",
      reporterReputation: 0.50
    };

    const result = processCommunityReport(citizenReport);
    assert.equal(result.cluster.status, "UNVERIFIED");
    assert.equal(result.cluster.verificationStatus, "PENDING");
    assert.equal(result.cluster.decision, "WARN", "Unverified report must be bounded to WARN");

    // Apply to journey: must NOT adapt or close route!
    const decision = buildIncidentDecision(result.cluster);
    const adaptation = applyIncidentToJourney(baselineJourney, decision, DEFAULT_TRAVELER);

    assert.equal(adaptation.adapted, false, "Unverified report must NOT adapt the route");
    assert.equal(adaptation.reason, "UNVERIFIED_REPORT_ADVISORY_ONLY");
    assert.equal(adaptation.advisory, true, "Advisory must be attached for awareness");
    assert.equal(adaptation.routeChanged, false);
  });

  // ─── 6. STRUCTURED DATA SEPARATION OF CONFIDENCE, VERIFICATION & SEVERITY ───
  it("6. Correctly separates evidence confidence, verification status, severity, and time validity", () => {
    // Highly confident report (trusted inspector) of a MINOR issue (severity = 0.2, e.g. slight puddle)
    const minorIssueReport = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Slight puddle on side curb, main step-free ramp clear",
      severity: 0.20, // LOW SEVERITY
      reporterId: "trusted-civic-marshal",
      reporterReputation: 0.95 // HIGH CONFIDENCE
    };

    const res = processCommunityReport(minorIssueReport);

    // Verify structured fields are separated
    assert.equal(typeof res.cluster.scores.communityConfidence, "number");
    assert.equal(res.cluster.severity, 0.20, "Severity must remain low regardless of reporter trust");
    assert.ok(res.cluster.timeValidity.expiresAt, "Time validity window must be present");
    assert.equal(res.cluster.timeValidity.maxDurationMinutes, 360);
    assert.equal(res.cluster.geographicScope.corridorId, "S3");
    assert.ok(["PENDING", "VERIFIED"].includes(res.cluster.verificationStatus));
  });
});
