import { describe, it } from "node:test";
import assert from "node:assert";
import { predictDomainImpact } from "../server/services/nugenWayfarerModel.js";

describe("Nugen Aligned Domain Intelligence Rules & Vulnerability Test Suite", () => {
  it("enforces CRITICAL risk and ACCESSIBILITY primary impact for wheelchair user facing flooding", async () => {
    const input = {
      weather: { temperatureC: 24, rainfallMmPerHour: 45, condition: "HEAVY_RAIN" },
      traveler: { mobility: "WHEELCHAIR", stepFreeRequired: true, stairsAllowed: false },
      route: { routeId: "route-A", corridorId: "S3", elevation: "LOW_COASTAL" },
      environment: { floodRisk: 0.85, waterAccumulationMm: 36, surfaceWetness: "FLOODED" },
      digitalTwin: { mode: "REAL" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.riskLevel, "CRITICAL");
    assert.strictEqual(res.primaryImpact, "ACCESSIBILITY");
    assert.strictEqual(res.accessibilityImpact, "CRITICAL");
    assert.strictEqual(res.routeRecommendation, "REROUTE");
    assert.strictEqual(res.confidence >= 0.90, true);
    assert.strictEqual(res.estimatedEtaDeltaMinutes >= 20, true);
    assert.strictEqual(res.predictedJourneyHealth <= 60, true);
  });

  it("enforces HIGH risk and SAFETY primary impact for senior traveler on wet flagstones", async () => {
    const input = {
      weather: { temperatureC: 25, rainfallMmPerHour: 20, condition: "MODERATE_RAIN" },
      traveler: { mobility: "SENIOR", walkingTolerance: "LOW" },
      route: { routeId: "route-A", corridorId: "S2" },
      environment: { floodRisk: 0.40, waterAccumulationMm: 12, surfaceWetness: "WATERLOGGED" },
      digitalTwin: { mode: "REAL" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.riskLevel, "HIGH");
    assert.strictEqual(res.primaryImpact, "SAFETY");
    assert.strictEqual(res.accessibilityImpact, "HIGH");
    assert.strictEqual(res.routeRecommendation, "WARN");
    assert.ok(res.reasoning.toLowerCase().includes("slip") || res.reasoning.toLowerCase().includes("senior"));
  });

  it("enforces HIGH risk and COMFORT impact during extreme heatwave conditions", async () => {
    const input = {
      weather: { temperatureC: 41, rainfallMmPerHour: 0, condition: "HEATWAVE" },
      traveler: { mobility: "STANDARD", comfortPriority: "HIGH" },
      route: { routeId: "route-A", corridorId: "S3", exposedSegments: 3 },
      environment: { floodRisk: 0.0, surfaceWetness: "DRY" },
      digitalTwin: { mode: "REAL" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.riskLevel, "HIGH");
    assert.strictEqual(res.primaryImpact, "COMFORT");
    assert.strictEqual(res.routeRecommendation, "WARN");
    assert.ok(res.reasoning.toLowerCase().includes("heat"));
  });

  it("recognizes elevated ridge and sheltered routes mitigate heavy rain (route-c recovery)", async () => {
    const input = {
      weather: { temperatureC: 24, rainfallMmPerHour: 45, condition: "HEAVY_RAIN" },
      traveler: { mobility: "WHEELCHAIR", stepFreeRequired: true },
      route: { routeId: "route-c", corridorId: "S3", elevation: "ELEVATED_RIDGE" },
      environment: { floodRisk: 0.18, waterAccumulationMm: 5, surfaceWetness: "DAMP" },
      digitalTwin: { mode: "REAL" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.riskLevel, "LOW");
    assert.strictEqual(res.primaryImpact, "NONE");
    assert.strictEqual(res.routeRecommendation, "CONTINUE");
    assert.strictEqual(res.accessibilityImpact, "NONE");
  });

  it("filters suspect social spam without distorting physical domain prediction", async () => {
    const input = {
      weather: { temperatureC: 26, rainfallMmPerHour: 5, condition: "LIGHT_RAIN" },
      traveler: { mobility: "STANDARD" },
      route: { routeId: "route-A", corridorId: "S1" },
      environment: { floodRisk: 0.12, surfaceWetness: "DAMP" },
      socialEvidence: {
        confidence: 0.35,
        floodingReports: 2,
        contradictionScore: 0.80,
        sourceTrustLevel: "SUSPECT_SPAM"
      },
      digitalTwin: { mode: "REAL" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.riskLevel, "LOW");
    assert.strictEqual(res.routeRecommendation, "MONITOR");
  });
});
