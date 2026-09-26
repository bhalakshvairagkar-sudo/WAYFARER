import { describe, it } from "node:test";
import assert from "node:assert";
import { buildDigitalTwinState, runWhatIfSimulation } from "../server/engine/digitalTwinEngine.js";
import { predictDomainImpact } from "../server/services/nugenWayfarerModel.js";
import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS } from "../server/data/defaultJourney.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";

describe("Nugen Digital Twin Simulation & Strict State Isolation Test Suite", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const baselineJourney = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER,
    stops: DEFAULT_STOPS,
    segments: initialSegments
  };

  it("strictly tags counterfactual simulation outputs with mode: SIMULATION and isSimulation: true", async () => {
    const input = {
      weather: { temperatureC: 24, rainfallMmPerHour: 60, condition: "TORRENTIAL_RAIN" },
      traveler: { mobility: "WHEELCHAIR", stepFreeRequired: true },
      route: { routeId: "route-A", corridorId: "S3" },
      environment: { floodRisk: 0.90, surfaceWetness: "FLOODED" },
      digitalTwin: { mode: "SIMULATION" }
    };

    const res = await predictDomainImpact(input);
    assert.strictEqual(res.mode, "SIMULATION");
    assert.strictEqual(res.isSimulation, true);
  });

  it("computes Nugen predictions for both live twin and simulated twin in runWhatIfSimulation", async () => {
    const whatIfParams = {
      rainfallMm: 65,
      temperatureC: 24,
      stormDurationHours: 2.5,
      floodProbability: 88,
      windSpeedKmH: 40
    };

    const sim = await runWhatIfSimulation(baselineJourney, whatIfParams);
    assert.strictEqual(sim.success, true);
    assert.strictEqual(sim.simulationMode, true);

    // Verify live twin Nugen prediction
    assert.ok(sim.liveTwin.nugenPrediction);
    assert.strictEqual(sim.liveTwin.simulationMode, false);
    assert.strictEqual(sim.liveTwin.nugenPrediction.isSimulation, false);

    // Verify simulated twin Nugen prediction
    assert.ok(sim.simulatedTwin.nugenPrediction);
    assert.strictEqual(sim.simulatedTwin.simulationMode, true);
    assert.strictEqual(sim.simulatedTwin.nugenPrediction.isSimulation, true);
    assert.ok(["WARN", "REROUTE", "AVOID_SEGMENT"].includes(sim.simulatedTwin.nugenPrediction.routeRecommendation));

    // Verify Nugen presence in comparison metrics
    const nugenMetric = sim.comparison.metrics.find(m => m.dimension === "Nugen Aligned AI Recommendation");
    assert.ok(nugenMetric);
    assert.ok(nugenMetric.currentLive);
    assert.ok(nugenMetric.whatIfSimulated);
    assert.ok(nugenMetric.adaptedMitigation);
  });

  it("ensures live journey state remains completely unmutated after What-If simulation", async () => {
    const copyBefore = JSON.parse(JSON.stringify(baselineJourney));

    await runWhatIfSimulation(baselineJourney, {
      rainfallMm: 75,
      temperatureC: 23,
      stormDurationHours: 3.0,
      floodProbability: 95
    });

    // Check no mutations to live traveler or route segments
    assert.deepStrictEqual(baselineJourney.trip, copyBefore.trip);
    assert.deepStrictEqual(baselineJourney.traveler, copyBefore.traveler);
    assert.strictEqual(baselineJourney.segments.length, copyBefore.segments.length);
  });
});
