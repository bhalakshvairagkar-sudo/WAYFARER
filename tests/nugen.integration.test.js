import { describe, it } from "node:test";
import assert from "node:assert";
import {
  predictDomainImpact,
  getNugenModelStatus,
  validateNugenOutput,
  normalizeNugenInput
} from "../server/services/nugenWayfarerModel.js";
import fs from "fs";
import path from "path";

describe("Nugen Intelligence Integration & Status Test Suite", () => {
  it("provides safe model status probe without leaking sensitive tokens", () => {
    const status = getNugenModelStatus();
    assert.strictEqual(typeof status.isConfigured, "boolean");
    assert.strictEqual(status.alignmentReady, true);
    assert.strictEqual(status.baseModelId, "qwen-v2p5-0p5b-instruct");
    assert.ok(status.deployedModelId.includes("wayfarer-weather-twin"));
    assert.ok(status.apiEndpoint.includes("/api/v3/inference/chat/completions"));
    assert.strictEqual(status.performanceMetrics.domain_accuracy >= 0.90, true);
    assert.strictEqual(status.performanceMetrics.confidence_average >= 90.0, true);
  });

  it("normalizes diverse input shapes into canonical Nugen input contract", () => {
    const raw = {
      weather: { temperature: 31, precipitationMm: 22 },
      traveler: { mobilityLevel: "WHEELCHAIR", requiresWheelchairAccess: true },
      route: { id: "segment-4", elevation: "MEDIUM" }
    };

    const norm = normalizeNugenInput(raw);
    assert.strictEqual(norm.weather.temperatureC, 31);
    assert.strictEqual(norm.weather.rainfallMmPerHour, 22);
    assert.strictEqual(norm.traveler.mobility, "WHEELCHAIR");
    assert.strictEqual(norm.traveler.stepFreeRequired, true);
    assert.strictEqual(norm.route.routeId, "segment-4");
    assert.strictEqual(norm.digitalTwin.mode, "REAL");
  });

  it("strictly validates outputs conforming to nugenOutput.schema.json", () => {
    const validOutput = {
      riskLevel: "CRITICAL",
      primaryImpact: "ACCESSIBILITY",
      affectedEntities: ["Curb Ramps"],
      predictedImpacts: [{ type: "MOBILITY_BARRIER", probability: 0.95, expectedMagnitude: "CRITICAL" }],
      routeRecommendation: "REROUTE",
      accessibilityImpact: "CRITICAL",
      estimatedEtaDeltaMinutes: 35,
      predictedJourneyHealth: 54,
      confidence: 0.96,
      uncertainty: 0.04,
      reasoning: "Wheelchair impassability due to water accumulation."
    };

    assert.strictEqual(validateNugenOutput(validOutput), true);

    const invalidOutput = {
      riskLevel: "EXTREME_DANGER", // Invalid enum
      primaryImpact: "ACCESSIBILITY"
    };

    assert.strictEqual(validateNugenOutput(invalidOutput), false);
  });

  it("gracefully runs deterministic domain inference when offline or unconfigured", async () => {
    const input = {
      weather: { temperatureC: 28, rainfallMmPerHour: 0, condition: "CLEAR" },
      traveler: { mobility: "STANDARD" },
      route: { routeId: "route-A" },
      environment: { floodRisk: 0.01, surfaceWetness: "DRY" },
      digitalTwin: { mode: "REAL" }
    };

    const prediction = await predictDomainImpact(input);
    assert.ok(prediction);
    assert.strictEqual(validateNugenOutput(prediction), true);
    assert.strictEqual(prediction.riskLevel, "LOW");
    assert.strictEqual(prediction.routeRecommendation, "CONTINUE");
    assert.strictEqual(prediction.confidence >= 0.85, true);
    assert.ok(["NUGEN_ALIGNED_WAYFARER_MODEL", "DETERMINISTIC_FALLBACK"].includes(prediction.modelSource));
  });

  it("verifies alignment metadata file exists and contains authentic configuration", () => {
    const alignmentPath = path.resolve(process.cwd(), "ai/nugen/alignment/alignment.json");
    assert.strictEqual(fs.existsSync(alignmentPath), true);
    const data = JSON.parse(fs.readFileSync(alignmentPath, "utf-8"));
    assert.strictEqual(data.base_model_id, "qwen-v2p5-0p5b-instruct");
    assert.strictEqual(data.status, "READY");
    assert.ok(data.document_ids.length > 0);
  });
});
