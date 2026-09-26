import { describe, it } from "node:test";
import assert from "node:assert";
import {
  processCommunityReport,
  analyzeIndependence,
  fuseEvidence,
  determineIncidentLifecycleStatus,
  evidenceStore
} from "../server/engine/evidenceFusionEngine.js";
import {
  buildIncidentDecision,
  calculatePersonalImpact,
  applyIncidentToJourney
} from "../server/engine/eventEngine.js";
import { calculateJourneyHealth, trackHealthTransition } from "../server/engine/journeyHealthEngine.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { generateAdaptationExplanation } from "../server/engine/explanationEngine.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from "../server/data/defaultJourney.js";

describe("WAYFARER Master Acceptance Verification (Phase 8)", () => {
  // Scenario A — Genuine Accessibility Disruption
  it("Scenario A: Genuine accessibility disruption adapts wheelchair route with 91 -> 57 -> 86 health story", async () => {
    // Reset evidence store to guarantee isolated testing
    evidenceStore.clusters.clear();
    evidenceStore.reports = [];

    // 1. Initial State: Wheelchair user, no stairs
    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    const baselineJourney = {
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments
    };

    const s3Initial = baselineJourney.segments.find(s => s.id === "S3");
    assert.strictEqual(s3Initial.recommendedRouteId, "B", "Initial recommended route must be Route B");
    
    // Baseline Journey Health
    const baselineHealth = calculateJourneyHealth(baselineJourney);
    assert.strictEqual(baselineHealth.overall, 91, "Baseline Journey Health must be 91");
    assert.strictEqual(baselineHealth.status, "OPTIMAL");

    // 2. Initial single report arrives: Elevator unavailable
    const singleReport = {
      resourceId: "S3",
      eventType: "ACCESSIBILITY_ISSUE",
      description: "Elevator mechanical failure reported at lower ramp deck entry.",
      severity: 0.9,
      reporterId: "traveler-witness-1",
      ipAddress: "49.36.11.20"
    };

    const initialResult = processCommunityReport(singleReport);
    assert.strictEqual(initialResult.cluster.status, "UNVERIFIED");
    assert.strictEqual(initialResult.cluster.decision, "WARN");

    // Initial report alone should NOT adapt the route
    const initialDecision = buildIncidentDecision(initialResult.cluster);
    const prematureAdaptation = applyIncidentToJourney(baselineJourney, initialDecision, DEFAULT_TRAVELER);
    assert.strictEqual(prematureAdaptation.adapted, false);
    assert.strictEqual(prematureAdaptation.routeChanged, false);

    // 3. Multi-witness organic corroboration arrives (3 distinct subnets, photos, low attack risk)
    const corroboratingReporters = [
      {
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        description: "Confirmed elevator out of order. Service tech on site.",
        severity: 0.9,
        reporterId: "traveler-witness-2",
        ipAddress: "103.45.67.89",
        mediaEvidence: { hasPhoto: true }
      },
      {
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        description: "Lower ramp elevator locked. Wheelchair users must use inland detour.",
        severity: 0.95,
        reporterId: "traveler-witness-3",
        ipAddress: "157.34.12.90",
        mediaEvidence: { hasPhoto: true }
      }
    ];

    let finalPipelineResult = null;
    for (const rep of corroboratingReporters) {
      finalPipelineResult = processCommunityReport(rep);
    }

    const multiWitnessCluster = finalPipelineResult.cluster;
    assert.strictEqual(multiWitnessCluster.reports.length >= 3, true);
    assert.ok(multiWitnessCluster.scores.communityConfidence >= 0.75, "Community confidence should be high");
    assert.ok(multiWitnessCluster.scores.attackRisk < 0.20, "Attack risk should be low");
    assert.ok(multiWitnessCluster.scores.actionConfidence >= 0.70, "Action confidence must qualify for ADAPT");
    assert.strictEqual(multiWitnessCluster.decision, "ADAPT");
    assert.strictEqual(multiWitnessCluster.status, "ACTIVE");

    // 4. Structured Decision Contract & Personalized Impact
    const structuredDecision = buildIncidentDecision(multiWitnessCluster);
    assert.strictEqual(structuredDecision.status, "ACTIVE");
    assert.strictEqual(structuredDecision.decision, "ADAPT");

    const personalImpact = calculatePersonalImpact(structuredDecision, DEFAULT_TRAVELER, baselineJourney);
    assert.strictEqual(personalImpact.severity, "CRITICAL", "Impact must be CRITICAL for wheelchair traveler");
    assert.strictEqual(personalImpact.recommendedAction, "ADAPT");

    // 5. Automatic Journey Adaptation
    const adaptationResult = applyIncidentToJourney(baselineJourney, structuredDecision, DEFAULT_TRAVELER);
    assert.strictEqual(adaptationResult.adapted, true);
    assert.strictEqual(adaptationResult.routeChanged, true);
    assert.strictEqual(adaptationResult.previousRecommendedId, "B");
    assert.strictEqual(adaptationResult.newRecommendedId, "C", "Route C (Inland Plateau Bypass) must win");

    const adaptedS3 = adaptationResult.updatedSegments.find(s => s.id === "S3");
    assert.strictEqual(adaptedS3.recommendedRouteId, "C");

    // 6. Journey Health Transition: 91 -> 57 -> 86
    const adaptedJourney = {
      ...baselineJourney,
      segments: adaptationResult.updatedSegments,
      eventRecord: adaptationResult.eventRecord
    };

    const healthStory = trackHealthTransition(baselineJourney, adaptationResult.eventRecord, adaptedJourney);
    assert.strictEqual(healthStory.before.overall, 91, "Health before incident: 91");
    assert.ok(healthStory.duringIncident.overall >= 55 && healthStory.duringIncident.overall <= 59, `Health during unmitigated incident: ~57, got ${healthStory.duringIncident.overall}`);
    assert.ok(healthStory.afterAdaptation.overall >= 84 && healthStory.afterAdaptation.overall <= 88, `Health after adaptation: ~86, got ${healthStory.afterAdaptation.overall}`);

    // 7. Explainability
    const newRoute = adaptedS3.candidateRoutes.find(r => r.id === "C");
    const explanation = await generateAdaptationExplanation(
      adaptationResult.eventRecord,
      adaptedS3,
      newRoute,
      DEFAULT_TRAVELER,
      adaptationResult.graphImpact
    );
    assert.ok(explanation.explanation.length > 20);
    assert.ok(explanation.structuredChange);
    assert.strictEqual(explanation.structuredChange.after.routeId, "C");
  });

  // Scenario B — Coordinated Attack
  it("Scenario B: Coordinated flood is quarantined, preserving route and journey health", () => {
    // Reset evidence store to guarantee isolated testing
    evidenceStore.clusters.clear();
    evidenceStore.reports = [];

    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    const baselineJourney = {
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments
    };

    const s3Initial = baselineJourney.segments.find(s => s.id === "S3");
    assert.strictEqual(s3Initial.recommendedRouteId, "B");
    const baselineHealth = calculateJourneyHealth(baselineJourney);
    assert.strictEqual(baselineHealth.overall, 91);

    // Simulate 10 rapid coordinated reports from single proxy subnet with identical coordinates and spam keywords
    const fakeIp = "185.220.101.5";
    let attackClusterResult = null;

    for (let i = 0; i < 10; i++) {
      attackClusterResult = processCommunityReport({
        resourceId: "S3",
        eventType: "SAFETY_HAZARD",
        severity: 0.95,
        description: `Attack flood spam repetitive violation text number ${i} free crypto claim`,
        reporterId: `attacker-bot-${i}`,
        reporterName: `Bot ${i}`,
        reporterReputation: 0.05,
        reporterLocation: { lat: 15.492000, lng: 73.832000 },
        mediaEvidence: { hasPhoto: false },
        ipAddress: fakeIp,
        timestamp: new Date(Date.now() + i * 150).toISOString()
      });
    }

    assert.ok(attackClusterResult.cluster);
    assert.ok(
      attackClusterResult.cluster.status === "QUARANTINED" || 
      attackClusterResult.cluster.decision === "QUARANTINE" ||
      attackClusterResult.cluster.scores.attackRisk >= 0.70
    );

    // Handed to Journey Engine: Must be rejected and blocked
    const attackDecision = buildIncidentDecision(attackClusterResult.cluster);
    const attemptResult = applyIncidentToJourney(baselineJourney, attackDecision, DEFAULT_TRAVELER);

    assert.strictEqual(attemptResult.adapted, false);
    assert.strictEqual(attemptResult.routeChanged, false);
    assert.strictEqual(attemptResult.reason, "QUARANTINED_ATTACK_OR_SPAM");

    // Route remains strictly unchanged
    assert.strictEqual(s3Initial.recommendedRouteId, "B");

    // Journey Health remains pristine at 91
    const postAttackHealth = calculateJourneyHealth(baselineJourney);
    assert.strictEqual(postAttackHealth.overall, 91);
  });
});
