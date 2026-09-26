import { describe, it } from "node:test";
import assert from "node:assert";
import {
  extractHardConstraints,
  validateRouteConstraints,
  filterValidRoutes,
  rankSegmentRoutes,
  deriveTravelerWeights,
  generateWhyNotExplanation
} from "../server/engine/scoringEngine.js";

describe("Hard Constraints Engine Tests (Phase 1)", () => {
  const wheelchairTraveler = {
    name: "Aditi",
    mobility: "wheelchair",
    accessibility: {
      stairsAllowed: false,
      stepFreeRequired: true,
      elevatorRequired: true,
      rampRequired: true
    },
    preferences: {
      safety: 0.30,
      accessibility: 0.40,
      crowd: 0.10,
      convenience: 0.10,
      cost: 0.10
    }
  };

  const standardTraveler = {
    name: "Alex",
    mobility: "standard",
    stairsAllowed: true,
    stepFreeRequired: false,
    elevatorRequired: false,
    crowdTolerance: "low",
    safetyPriority: "high"
  };

  const routeWithStairs = {
    id: "A",
    name: "Route A: Coastal Bastion Path",
    tagline: "Historic Scenic Stairs",
    safety: 82,
    accessibility: 45,
    crowd: 65,
    convenience: 90,
    cost: { estimated: 150 },
    hasStairs: true,
    accessibleFeatures: ["Cobblestone stairs near lower bastion", "Narrow curbs"]
  };

  const routeStepFreeAccessible = {
    id: "B",
    name: "Route B: Mandovi Promenade & Heritage Ramp",
    tagline: "100% Step-Free & Continuous Ramp",
    safety: 90,
    accessibility: 96,
    crowd: 85,
    convenience: 86,
    cost: { estimated: 200 },
    isStepFree: true,
    accessibleFeatures: [
      "Step-free ramped access (1:12 slope)",
      "Elevator-assisted viewing deck access",
      "Dedicated wheelchair shuttle bay"
    ]
  };

  const routeLowCrowdScenic = {
    id: "C",
    name: "Route C: Plateau Scenic Bypass",
    tagline: "Low Crowd & Shaded Path",
    safety: 88,
    accessibility: 91,
    crowd: 95,
    convenience: 80,
    cost: { estimated: 180 },
    isStepFree: true,
    accessibleFeatures: ["Step-free upper plateau bypass (slope 1:15)", "Wide paved path"]
  };

  it("extracts hard constraints separately from preferences", () => {
    const constraints = extractHardConstraints(wheelchairTraveler);
    assert.strictEqual(constraints.isWheelchair, true);
    assert.strictEqual(constraints.stairsAllowed, false);
    assert.strictEqual(constraints.stepFreeRequired, true);
    assert.strictEqual(constraints.elevatorRequired, true);
  });

  it("wheelchair + stairs -> eliminated", () => {
    const validation = validateRouteConstraints(routeWithStairs, wheelchairTraveler);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.violations.some(v => v.includes("stairs")));

    const validRoutes = filterValidRoutes([routeWithStairs, routeStepFreeAccessible], wheelchairTraveler);
    assert.strictEqual(validRoutes.length, 1);
    assert.strictEqual(validRoutes[0].id, "B");
    assert.ok(!validRoutes.find(r => r.id === "A"), "Route with stairs must be eliminated for wheelchair user");
  });

  it("wheelchair + no step-free -> eliminated", () => {
    const routeNonStepFree = {
      id: "D",
      name: "Route D: Curb Link",
      accessibility: 60,
      safety: 80,
      crowd: 80,
      convenience: 85,
      isStepFree: false,
      accessibleFeatures: ["Steep curb step", "No ramp"]
    };

    const validation = validateRouteConstraints(routeNonStepFree, wheelchairTraveler);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.violations.some(v => v.toLowerCase().includes("step-free")));

    const validRoutes = filterValidRoutes([routeNonStepFree, routeStepFreeAccessible], wheelchairTraveler);
    assert.strictEqual(validRoutes.length, 1);
    assert.strictEqual(validRoutes[0].id, "B");
  });

  it("wheelchair + elevator unavailable -> affected route eliminated", () => {
    const routeWithBrokenElevator = {
      ...routeStepFreeAccessible,
      id: "B_BROKEN",
      elevatorAvailable: false,
      activeEvent: {
        type: "ACCESSIBILITY_DEGRADATION",
        reason: "Elevator mechanical failure on north terrace",
        note: "Elevator out of service"
      }
    };

    const validation = validateRouteConstraints(routeWithBrokenElevator, wheelchairTraveler);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.violations.some(v => v.toLowerCase().includes("elevator")));

    // When Route B has broken elevator, only Route C is valid
    const candidates = [routeWithStairs, routeWithBrokenElevator, routeLowCrowdScenic];
    const validRoutes = filterValidRoutes(candidates, wheelchairTraveler);
    
    assert.strictEqual(validRoutes.length, 1);
    assert.strictEqual(validRoutes[0].id, "C", "Route C should be the only valid candidate remaining");
  });

  it("normal traveler + stairs -> still eligible", () => {
    const validation = validateRouteConstraints(routeWithStairs, standardTraveler);
    assert.strictEqual(validation.valid, true, "Standard traveler with stairsAllowed=true should find route eligible");

    const validRoutes = filterValidRoutes([routeWithStairs, routeStepFreeAccessible], standardTraveler);
    assert.strictEqual(validRoutes.length, 2, "Both routes should be valid for standard traveler");
  });

  it("preferred low-crowd route -> ranking difference only", () => {
    // Both route B and C are valid step-free routes
    const weightsHighCrowdPreference = {
      safety: 0.15,
      accessibility: 0.25,
      crowd: 0.45, // Heavy preference for low crowd
      convenience: 0.10,
      cost: 0.05
    };

    const weightsStandardAccessibility = {
      safety: 0.25,
      accessibility: 0.40, // Heavy preference for accessibility
      crowd: 0.15,
      convenience: 0.10,
      cost: 0.10
    };

    // Low-crowd preferred -> Route C (crowd=95) ranks #1
    const rankedCrowd = rankSegmentRoutes([routeStepFreeAccessible, routeLowCrowdScenic], weightsHighCrowdPreference, wheelchairTraveler);
    assert.strictEqual(rankedCrowd[0].id, "C");
    assert.strictEqual(rankedCrowd[0].isRecommended, true);

    // Accessibility preferred -> Route B (accessibility=96) ranks #1
    const rankedAccess = rankSegmentRoutes([routeStepFreeAccessible, routeLowCrowdScenic], weightsStandardAccessibility, wheelchairTraveler);
    assert.strictEqual(rankedAccess[0].id, "B");
    assert.strictEqual(rankedAccess[0].isRecommended, true);
  });

  it("rankSegmentRoutes never recommends an eliminated route", () => {
    const weights = { safety: 0.25, accessibility: 0.35, crowd: 0.15, convenience: 0.10, cost: 0.15 };
    // Route A has higher convenience (90) but contains stairs
    const ranked = rankSegmentRoutes([routeWithStairs, routeLowCrowdScenic], weights, wheelchairTraveler);

    const recommended = ranked.find(r => r.isRecommended);
    assert.strictEqual(recommended.id, "C");
    
    const routeA = ranked.find(r => r.id === "A");
    assert.strictEqual(routeA.isEliminated, true);
    assert.strictEqual(routeA.isRecommended, false);
    assert.ok(routeA.violations.length > 0);
  });

  it("generateWhyNotExplanation documents hard constraint violations", () => {
    const weights = { safety: 0.25, accessibility: 0.35, crowd: 0.15, convenience: 0.10, cost: 0.15 };
    const explanation = generateWhyNotExplanation([routeWithStairs, routeStepFreeAccessible], weights, wheelchairTraveler);
    
    assert.strictEqual(explanation.recommended.routeId, "B");
    const rejectedA = explanation.rejected.find(r => r.routeId === "A");
    assert.ok(rejectedA);
    assert.strictEqual(rejectedA.isEliminated, true);
    assert.ok(rejectedA.reasons.some(r => r.includes("HARD CONSTRAINT VIOLATION")));
  });
});
