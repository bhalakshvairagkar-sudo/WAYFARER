import { describe, it } from "node:test";
import assert from "node:assert";
import {
  deriveTravelerWeights,
  calculateRouteScore,
  rankSegmentRoutes,
  calculateOverallJourneyScore
} from "../server/engine/scoringEngine.js";

describe("Scoring Engine Tests", () => {
  it("weights must normalize to 1.00 exactly", () => {
    const wheelchairTraveler = {
      mobility: "wheelchair",
      stairsAllowed: false,
      rampsPreferred: true,
      safetyPriority: "high",
      crowdTolerance: "low",
      longerRouteAccepted: true
    };

    const weights = deriveTravelerWeights(wheelchairTraveler);
    const sum = Number((weights.safety + weights.accessibility + weights.crowd + weights.convenience).toFixed(2));
    
    assert.strictEqual(sum, 1.0);
    assert.strictEqual(weights.accessibility >= 0.35, true, "Wheelchair user should have highest accessibility weight");
    assert.strictEqual(weights.safety >= 0.25, true, "Safety priority should be elevated");
  });

  it("calculates candidate route score using deterministic formula", () => {
    const weights = { safety: 0.30, accessibility: 0.40, crowd: 0.20, convenience: 0.10 };
    const routeB = {
      id: "B",
      safety: 90,
      accessibility: 96,
      crowd: 85,
      convenience: 86
    };

    const result = calculateRouteScore(routeB, weights);
    // (0.30 * 90) + (0.40 * 96) + (0.20 * 85) + (0.10 * 86) = 27 + 38.4 + 17 + 8.6 = 91.0
    assert.strictEqual(result.compositeScore, 91);
  });

  it("ranks candidate routes and marks highest composite score as recommended", () => {
    const weights = { safety: 0.30, accessibility: 0.40, crowd: 0.20, convenience: 0.10 };
    const routes = [
      { id: "A", safety: 82, accessibility: 45, crowd: 61, convenience: 92 },
      { id: "B", safety: 90, accessibility: 96, crowd: 85, convenience: 86 },
      { id: "C", safety: 88, accessibility: 91, crowd: 85, convenience: 82 }
    ];

    const ranked = rankSegmentRoutes(routes, weights);
    assert.strictEqual(ranked[0].id, "B");
    assert.strictEqual(ranked[0].isRecommended, true);
    assert.strictEqual(ranked[0].score, 91);
    assert.strictEqual(ranked[1].id, "C");
    assert.strictEqual(ranked[1].score, 88);
  });

  it("calculates overall journey score from segments", () => {
    const mockSegments = [
      { id: "S1", day: 1, candidateRoutes: [{ isRecommended: true, score: 91 }] },
      { id: "S2", day: 1, candidateRoutes: [{ isRecommended: true, score: 91 }] },
      { id: "S3", day: 2, candidateRoutes: [{ isRecommended: true, score: 87 }] },
      { id: "S4", day: 3, candidateRoutes: [{ isRecommended: true, score: 94 }] }
    ];

    const result = calculateOverallJourneyScore(mockSegments);
    assert.strictEqual(result.dayScores[1], 91);
    assert.strictEqual(result.dayScores[2], 87);
    assert.strictEqual(result.dayScores[3], 94);
    assert.strictEqual(result.overallScore, 91);
    assert.strictEqual(result.fitLevel, "EXCELLENT FIT");
  });
});
