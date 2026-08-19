import { describe, it } from "node:test";
import assert from "node:assert";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { applyJourneyEvent } from "../server/engine/eventEngine.js";
import { checkDownstreamImpact } from "../server/engine/downstreamOptimizer.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from "../server/data/defaultJourney.js";

describe("Event Engine & Re-Optimization Tests", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const journeyState = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER,
    segments: initialSegments
  };

  it("hero elevator failure event re-evaluates S3 and promotes Route C", () => {
    const elevatorEvent = {
      type: "ACCESSIBILITY_DEGRADATION",
      segmentId: "S3",
      routeId: "B",
      severity: 1.0,
      reason: "Elevator unavailable at lower Fort Aguada ramp entry",
      delta: {
        accessibility: 58 // 96 - 58 = 38
      }
    };

    const result = applyJourneyEvent(journeyState, elevatorEvent);

    assert.strictEqual(result.routeChanged, true, "Route recommendation must change");
    assert.strictEqual(result.previousRecommendedId, "B");
    assert.strictEqual(result.newRecommendedId, "C", "Route C must win after Route B elevator failure");

    const routeB = result.affectedSegment.candidateRoutes.find(r => r.id === "B");
    const routeC = result.affectedSegment.candidateRoutes.find(r => r.id === "C");

    assert.strictEqual(routeB.accessibility, 38);
    assert.strictEqual(routeB.score, 68);
    assert.strictEqual(routeC.score, 88);
    assert.strictEqual(routeC.isRecommended, true);
  });

  it("downstream impact correctly handles minor route shift vs crowd delay", () => {
    // Elevator shift (+3m) -> No conflict
    const elevatorImpact = checkDownstreamImpact(initialSegments, "S3", { type: "ACCESSIBILITY_DEGRADATION" });
    assert.strictEqual(elevatorImpact.hasDownstreamImpact, false);
    assert.strictEqual(elevatorImpact.statusBadge, "CURRENT CHANGE DOES NOT AFFECT LATER STOPS");

    // Crowd Spike (+45m shift) -> Re-optimized
    const crowdImpact = checkDownstreamImpact(initialSegments, "S5", { type: "CROWD_SPIKE" });
    assert.strictEqual(crowdImpact.hasDownstreamImpact, true);
    assert.strictEqual(crowdImpact.statusBadge, "JOURNEY RE-OPTIMIZED");
    assert.strictEqual(crowdImpact.cascadeDelayMin, 45);
  });
});
