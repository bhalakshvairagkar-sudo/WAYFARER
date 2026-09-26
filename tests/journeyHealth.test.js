import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateJourneyHealth, trackHealthTransition } from "../server/engine/journeyHealthEngine.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { applyJourneyEvent } from "../server/engine/eventEngine.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from "../server/data/defaultJourney.js";

describe("Journey Health Engine Tests (Phase 5)", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const baselineJourney = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER,
    stops: DEFAULT_STOPS,
    segments: initialSegments
  };

  it("calculates high baseline journey health (~91) across 6 dimensions", () => {
    const health = calculateJourneyHealth(baselineJourney);

    assert.ok(health.overall >= 89 && health.overall <= 93, `Expected baseline health ~91, got ${health.overall}`);
    assert.strictEqual(health.status, "OPTIMAL");
    assert.ok(health.accessibility >= 90);
    assert.ok(health.safety >= 85);
    assert.ok(health.reliability >= 80);
    assert.ok(health.comfort >= 80);
    assert.ok(health.disruption >= 90);
  });

  it("health collapses to ~57 during active unmitigated incident", () => {
    const incidentHealth = calculateJourneyHealth(baselineJourney, {
      activeIncident: { severity: 1.0, reason: "Elevator mechanical failure" },
      simulateDegradation: { accessibility: 38 }
    });

    assert.ok(incidentHealth.overall >= 54 && incidentHealth.overall <= 60, `Expected incident health ~57, got ${incidentHealth.overall}`);
    assert.strictEqual(incidentHealth.status, "DEGRADED");
    assert.ok(incidentHealth.accessibility <= 40);
    assert.ok(incidentHealth.disruption <= 55);
  });

  it("health recovers to ~86 after alternative route adaptation", () => {
    const elevatorEvent = {
      type: "ACCESSIBILITY_DEGRADATION",
      segmentId: "S3",
      routeId: "B",
      severity: 1.0,
      reason: "Elevator unavailable at lower ramp entry",
      delta: { accessibility: 58 }
    };

    const adaptedResult = applyJourneyEvent(baselineJourney, elevatorEvent);
    const adaptedJourney = {
      ...baselineJourney,
      segments: adaptedResult.updatedSegments,
      eventRecord: adaptedResult.eventRecord
    };

    const adaptedHealth = calculateJourneyHealth(adaptedJourney, {
      activeIncident: { severity: 0.3 }
    });

    assert.ok(adaptedHealth.overall >= 84 && adaptedHealth.overall <= 89, `Expected adapted health ~86, got ${adaptedHealth.overall}`);
    assert.strictEqual(adaptedHealth.status, "GOOD");
    assert.ok(adaptedHealth.accessibility >= 90, "Accessibility restored via step-free Route C");
  });

  it("trackHealthTransition produces the visible 91 -> 57 -> 86 story", () => {
    const elevatorEvent = {
      type: "ACCESSIBILITY_DEGRADATION",
      segmentId: "S3",
      routeId: "B",
      severity: 1.0,
      reason: "Elevator unavailable at lower ramp entry",
      delta: { accessibility: 58 }
    };

    const adaptedResult = applyJourneyEvent(baselineJourney, elevatorEvent);
    const adaptedJourney = {
      ...baselineJourney,
      segments: adaptedResult.updatedSegments,
      eventRecord: adaptedResult.eventRecord
    };

    const transition = trackHealthTransition(baselineJourney, elevatorEvent, adaptedJourney);

    assert.ok(transition.before.overall >= 89);
    assert.ok(transition.duringIncident.overall <= 60);
    assert.ok(transition.afterAdaptation.overall >= 84);
    assert.ok(transition.story.includes("→"));
  });
});
