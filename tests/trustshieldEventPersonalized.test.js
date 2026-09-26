import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildIncidentDecision,
  calculatePersonalImpact,
  applyIncidentToJourney
} from "../server/engine/eventEngine.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from "../server/data/defaultJourney.js";

describe("TrustShield to Event Engine & Personalized Impact Tests (Phase 3 & 4)", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const baselineJourney = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER, // Wheelchair user
    stops: DEFAULT_STOPS,
    segments: initialSegments
  };

  const wheelchairProfile = {
    name: "Aditi",
    mobility: "wheelchair",
    accessibility: {
      stairsAllowed: false,
      stepFreeRequired: true,
      elevatorRequired: true
    }
  };

  const seniorProfile = {
    name: "Ramesh",
    mobility: "elderly",
    stairsAllowed: false,
    stepFreeRequired: false,
    elevatorRequired: true
  };

  const normalProfile = {
    name: "Karan",
    mobility: "standard",
    stairsAllowed: true,
    stepFreeRequired: false,
    elevatorRequired: false
  };

  const mockElevatorCluster = {
    id: "cluster-elevator-S3",
    resourceId: "S3",
    eventType: "ACCESSIBILITY_ISSUE",
    title: "Elevator mechanical failure on north platform ramp",
    status: "ACTIVE",
    decision: "ADAPT",
    lastReportedAt: new Date().toISOString(),
    scores: {
      communityConfidence: 0.91,
      attackRisk: 0.03,
      actionConfidence: 0.89,
      decision: "ADAPT"
    },
    independenceAnalysis: {
      independentConfirmationsCount: 5,
      uniqueSubnetsCount: 4
    },
    evidenceFusion: {
      independentConfirmations: 1.0,
      proximity: 0.95,
      recency: 0.90,
      mediaEvidence: 0.95,
      attackRisk: 0.03,
      contradictions: 0
    },
    reports: [
      {
        id: "rep-1",
        description: "Elevator out of order, technician on site",
        severity: 0.9
      }
    ]
  };

  it("buildIncidentDecision outputs the canonical structured contract", () => {
    const decision = buildIncidentDecision(mockElevatorCluster);
    assert.strictEqual(decision.incidentId, "cluster-elevator-S3");
    assert.strictEqual(decision.eventType, "ACCESSIBILITY_ISSUE");
    assert.strictEqual(decision.status, "ACTIVE");
    assert.strictEqual(decision.decision, "ADAPT");
    assert.strictEqual(decision.communityConfidence, 0.91);
    assert.strictEqual(decision.attackRisk, 0.03);
    assert.strictEqual(decision.actionConfidence, 0.89);
    assert.deepStrictEqual(decision.affectedSegments, ["S3"]);
    assert.ok(decision.explanationContext);
    assert.strictEqual(decision.explanationContext.independentConfirmations, 5);
  });

  it("calculates personalized impact: CRITICAL for wheelchair traveler on elevator outage", () => {
    const decision = buildIncidentDecision(mockElevatorCluster);
    const impact = calculatePersonalImpact(decision, wheelchairProfile, baselineJourney);

    assert.strictEqual(impact.severity, "CRITICAL");
    assert.strictEqual(impact.recommendedAction, "ADAPT");
    assert.strictEqual(impact.accessibilityImpact >= 0.90, true);
    assert.deepStrictEqual(impact.affectedSegments, ["S3"]);
  });

  it("calculates personalized impact: HIGH for senior traveler on elevator outage", () => {
    const decision = buildIncidentDecision(mockElevatorCluster);
    const impact = calculatePersonalImpact(decision, seniorProfile, baselineJourney);

    assert.strictEqual(impact.severity, "HIGH");
    assert.strictEqual(impact.recommendedAction, "ADAPT");
    assert.strictEqual(impact.accessibilityImpact >= 0.65, true);
  });

  it("calculates personalized impact: LOW for standard traveler on elevator outage (advisory only)", () => {
    const decision = buildIncidentDecision(mockElevatorCluster);
    const impact = calculatePersonalImpact(decision, normalProfile, baselineJourney);

    assert.strictEqual(impact.severity, "LOW");
    assert.strictEqual(impact.recommendedAction, "WARN", "Standard traveler should only receive a warning, not forced rerouting");
    assert.strictEqual(impact.accessibilityImpact <= 0.20, true);
  });

  it("applyIncidentToJourney automatically adapts wheelchair route and promotes Route C", () => {
    const decision = buildIncidentDecision(mockElevatorCluster);
    const result = applyIncidentToJourney(baselineJourney, decision, wheelchairProfile);

    assert.strictEqual(result.adapted, true);
    assert.strictEqual(result.routeChanged, true);
    assert.strictEqual(result.newRecommendedId, "C", "Route C must be promoted when elevator breaks on Route B");
    assert.strictEqual(result.personalImpact.severity, "CRITICAL");

    // Verify S3 in updatedSegments has Route C as recommended
    const s3 = result.updatedSegments.find(s => s.id === "S3");
    assert.strictEqual(s3.recommendedRouteId, "C");
  });

  it("applyIncidentToJourney preserves normal traveler route without mutation", () => {
    const normalJourney = {
      ...baselineJourney,
      traveler: normalProfile
    };
    const decision = buildIncidentDecision(mockElevatorCluster);
    const result = applyIncidentToJourney(normalJourney, decision, normalProfile);

    assert.strictEqual(result.adapted, false);
    assert.strictEqual(result.routeChanged, false);
    assert.strictEqual(result.advisory, true);
    assert.strictEqual(result.personalImpact.recommendedAction, "WARN");
  });

  it("applyIncidentToJourney blocks quarantined attacks from altering any traveler journey", () => {
    const quarantinedCluster = {
      ...mockElevatorCluster,
      id: "cluster-quarantined-attack",
      status: "QUARANTINED",
      decision: "QUARANTINE",
      scores: {
        communityConfidence: 0.10,
        attackRisk: 0.95,
        actionConfidence: 0.01,
        decision: "QUARANTINE"
      }
    };

    const decision = buildIncidentDecision(quarantinedCluster);
    const result = applyIncidentToJourney(baselineJourney, decision, wheelchairProfile);

    assert.strictEqual(result.adapted, false);
    assert.strictEqual(result.routeChanged, false);
    assert.strictEqual(result.reason, "QUARANTINED_ATTACK_OR_SPAM");
  });
});
