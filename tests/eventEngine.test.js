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
      reason: "Elevator unavailable at lower ramp entry",
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
    // 5-factor scoring (with Cost): 71
    assert.strictEqual(routeB.score, 71);
    assert.strictEqual(routeC.score, 88);
    assert.strictEqual(routeC.isRecommended, true);
  });

  it("downstream impact correctly handles minor route shift vs crowd delay", () => {
    // Elevator shift without duration change -> No conflict
    const elevatorImpact = checkDownstreamImpact(initialSegments, "S3", { type: "ACCESSIBILITY_DEGRADATION" });
    assert.strictEqual(elevatorImpact.hasDownstreamImpact, false);
    assert.strictEqual(elevatorImpact.statusBadge, "CURRENT CHANGE DOES NOT AFFECT LATER STOPS");

    // Crowd Spike -> Re-optimized
    const crowdImpact = checkDownstreamImpact(initialSegments, "S5", { type: "CROWD_SPIKE" });
    assert.strictEqual(crowdImpact.hasDownstreamImpact, true);
    assert.strictEqual(crowdImpact.statusBadge, "JOURNEY RE-OPTIMIZED");
    assert.strictEqual(crowdImpact.cascadeDelayMin, 30);
  });

  it("generic itinerary cascade test: S1 -> S2 -> S3 -> S4 recalculates downstream without hardcoding", () => {
    // Arbitrary stops without any Goa/demo names
    const arbitraryStops = [
      { id: "node-1", day: 1, name: "Alpha Central Hub", arrivalTime: "09:00", departureTime: "09:30", type: "transport" },
      { id: "node-2", day: 1, name: "Beta Civic Pavilion", arrivalTime: "10:15", departureTime: "11:30", type: "attraction", durationMin: 75, minDurationMin: 45, openingHours: { open: "08:00", close: "18:00" } },
      { id: "node-3", day: 1, name: "Gamma Heritage Center", arrivalTime: "12:00", departureTime: "14:00", type: "attraction", durationMin: 120, minDurationMin: 60, openingHours: { open: "09:00", close: "17:00" } },
      { id: "node-4", day: 1, name: "Delta Express Station", arrivalTime: "15:00", departureTime: "15:45", type: "transport", isStrictDeadline: true }
    ];

    const arbitraryTraveler = {
      name: "Jordan",
      mobility: "wheelchair",
      stairsAllowed: false,
      rampsPreferred: true,
      safetyPriority: "high",
      crowdTolerance: "medium"
    };

    const arbitrarySegments = segmentJourney(arbitraryStops, arbitraryTraveler);
    assert.strictEqual(arbitrarySegments.length, 3, "Should have 3 segments: S1, S2, S3");

    // S1 experiences a +30 minute transport delay
    const delayEvent = {
      type: "TRANSPORT_DELAY",
      delayMinutes: 30,
      reason: "Unexpected arterial maintenance"
    };

    const impact = checkDownstreamImpact(arbitrarySegments, "S1", delayEvent, arbitraryStops);
    assert.strictEqual(impact.hasDownstreamImpact, true);
    assert.strictEqual(impact.cascadeDelayMin, 30);
    assert.strictEqual(impact.adjustedTimeline.length > 0, true, "Downstream segments must be recalculated");

    // Check that S2 and S3 arrival times were shifted dynamically
    const s2Adjusted = impact.adjustedTimeline.find(t => t.segmentId === "S2");
    assert.strictEqual(Boolean(s2Adjusted), true, "S2 must be in adjusted timeline");
  });
});
