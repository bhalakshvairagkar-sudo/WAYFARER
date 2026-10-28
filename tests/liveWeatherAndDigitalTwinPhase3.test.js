/**
 * WAYFARER AI - Phase 3 Live Weather & Environmental Intelligence Test Suite
 * 
 * Verifies P0 Exit Criteria:
 * 1. Fresh weather data updates segment-level impact calculations and route scoring.
 * 2. Stale data is clearly labeled and handled according to policy (widened uncertainty, reduced confidence).
 * 3. A forecast is NOT presented as a confirmed road hazard (strict separation of predictive atmosphere vs verified ground passability).
 * 4. A hypothetical What-If scenario does NOT change the live route (strict simulation isolation).
 * 5. Missing weather data does NOT cause the system to invent a risk score (strictly null risk score and preserved baseline).
 * 6. Contradictory weather data triggers high uncertainty flags.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  classifyRainIntensity,
  normalizeWeatherData,
  evaluateWeatherFreshness,
  generateSimulatedWeather
} from "../server/engine/weatherProvider.js";
import {
  computeCorridorSurfaceState,
  evaluateTravelerWeatherImpact,
  computeSegmentWeatherImpact
} from "../server/engine/weatherImpactEngine.js";
import {
  applyWeatherEvidenceToRoute,
  deriveTravelerWeights
} from "../server/engine/scoringEngine.js";
import {
  buildDigitalTwinState,
  runWhatIfSimulation
} from "../server/engine/digitalTwinEngine.js";
import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS } from "../server/data/defaultJourney.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";

describe("Phase 3 — Live Weather & Environmental Intelligence Test Suite", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const baselineJourney = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER,
    stops: DEFAULT_STOPS,
    segments: initialSegments
  };

  const sampleSegment = {
    id: "S1",
    from: "CSMT",
    to: "Gateway of India",
    durationMin: 20,
    distanceKm: 2.8,
    candidateRoutes: [
      {
        id: "A",
        name: "Direct Coastal Arterial",
        score: 85,
        elevationMeters: 3,
        accessibleFeatures: ["Standard sidewalk", "Low curb"]
      },
      {
        id: "B",
        name: "Sheltered Heritage Arcade",
        score: 88,
        elevationMeters: 7,
        accessibleFeatures: ["Continuous covered colonnade", "Step-free ramp"]
      }
    ]
  };

  // ─── 1. FRESH WEATHER DATA UPDATES IMPACT CALCULATIONS ───
  it("1. Fresh weather data updates travel time impact and route scoring", () => {
    const freshLiveWeather = normalizeWeatherData({
      current: {
        time: new Date().toISOString(),
        temperature_2m: 27.5,
        relative_humidity_2m: 88,
        precipitation: 18.0, // Moderate-to-heavy rain
        weather_code: 63,
        wind_speed_10m: 22.0
      },
      retrievalTimestamp: new Date().toISOString()
    }, "LIVE");

    assert.strictEqual(freshLiveWeather.freshnessStatus, "FRESH");
    assert.strictEqual(freshLiveWeather.stale, false);
    assert.ok(freshLiveWeather.validityWindow.validUntil > freshLiveWeather.validityWindow.validFrom);

    const segmentImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: freshLiveWeather,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(segmentImpact.weatherAvailable, true);
    assert.strictEqual(segmentImpact.evaluated, true);
    assert.strictEqual(segmentImpact.freshnessStatus, "FRESH");
    assert.ok(segmentImpact.travelTimeImpact.estimatedDelayMinutes > 0, "Delay should be calculated");
    assert.ok(segmentImpact.travelTimeImpact.trafficSlowdownMultiplier > 1.0, "Traffic friction should slow pace");
    assert.ok(segmentImpact.routeRisk.riskScore > 0, "Risk score should be positive");
    assert.ok(segmentImpact.routeRisk.uncertaintyBand.minRisk < segmentImpact.routeRisk.riskScore);
    assert.ok(segmentImpact.routeRisk.uncertaintyBand.maxRisk > segmentImpact.routeRisk.riskScore);

    // Apply to route scoring
    const weights = deriveTravelerWeights(DEFAULT_TRAVELER);
    const scoredRouteA = applyWeatherEvidenceToRoute(sampleSegment.candidateRoutes[0], segmentImpact, weights);
    const scoredRouteB = applyWeatherEvidenceToRoute(sampleSegment.candidateRoutes[1], segmentImpact, weights);

    assert.ok(scoredRouteA.weatherAdjustedScore < sampleSegment.candidateRoutes[0].score, "Exposed route score should degrade under heavy rain");
    assert.ok(scoredRouteB.weatherAdjustedScore >= scoredRouteA.weatherAdjustedScore, "Sheltered route should be more resilient");
  });

  // ─── 2. STALE DATA IS CLEARLY LABELED AND WIDENS UNCERTAINTY ───
  it("2. Stale data is labeled according to policy, halving confidence and widening uncertainty band", () => {
    // Timestamp 90 minutes in the past
    const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const staleWeather = normalizeWeatherData({
      current: {
        time: ninetyMinutesAgo,
        temperature_2m: 29.0,
        precipitation: 12.0,
        weather_code: 61
      },
      retrievalTimestamp: ninetyMinutesAgo
    }, "LIVE");

    assert.strictEqual(staleWeather.stale, true);
    assert.strictEqual(staleWeather.freshnessStatus, "STALE");
    assert.strictEqual(staleWeather.stalenessPolicy, "DEGRADE_CONFIDENCE_WIDEN_UNCERTAINTY");

    const segmentImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: staleWeather,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(segmentImpact.stale, true);
    assert.strictEqual(segmentImpact.freshnessStatus, "STALE");
    // Confidence discounted by 50%
    assert.ok(segmentImpact.routeRisk.uncertaintyBand.confidence < 0.50, `Expected confidence < 0.50, got ${segmentImpact.routeRisk.uncertaintyBand.confidence}`);
    // Uncertainty band widened
    const bandSpread = segmentImpact.routeRisk.uncertaintyBand.maxRisk - segmentImpact.routeRisk.uncertaintyBand.minRisk;
    assert.ok(bandSpread >= 35, `Expected wide band spread >= 35 for stale data, got ${bandSpread}`);
    assert.ok(segmentImpact.routeRisk.uncertaintyReason.includes("stale"));
  });

  // ─── 3. A FORECAST IS NOT PRESENTED AS A CONFIRMED ROAD HAZARD ───
  it("3. A forecast or atmospheric precipitation is NOT presented as a confirmed road hazard without ground evidence", () => {
    // Atmospheric provider reporting heavy rain forecast
    const forecastWeather = normalizeWeatherData({
      current: {
        time: new Date().toISOString(),
        temperature_2m: 26.0,
        precipitation: 25.0, // Significant rain
        weather_code: 65
      },
      hourly: {
        time: [new Date().toISOString(), new Date(Date.now() + 3600000).toISOString()],
        weather_code: [65, 65],
        temperature_2m: [26.0, 25.5],
        precipitation: [25.0, 30.0],
        precipitation_probability: [85, 90]
      },
      retrievalTimestamp: new Date().toISOString()
    }, "FORECAST");

    // Without ground reports corroborating flooding
    const uncorroboratedImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: forecastWeather,
      groundReports: [], // NO ground reports!
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(uncorroboratedImpact.isConfirmedHazard, false, "Forecast alone must NOT be a confirmed road hazard");
    assert.notStrictEqual(uncorroboratedImpact.hazardClassification, "CONFIRMED_HAZARD");
    assert.ok(uncorroboratedImpact.advisory.includes("Not a confirmed road closure"));

    // Now test with verified ground report corroborating deep waterlogging
    const groundCorroboratedReports = [
      {
        id: "rep-1",
        segmentId: "S1",
        type: "FLOOD",
        trustShield: { actionConfidence: 0.85, impactConfidence: 0.90 }
      }
    ];

    const corroboratedImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: forecastWeather,
      groundReports: groundCorroboratedReports,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(corroboratedImpact.isConfirmedHazard, true, "Corroborated report must confirm road hazard");
    assert.strictEqual(corroboratedImpact.hazardClassification, "CONFIRMED_HAZARD");
    assert.strictEqual(corroboratedImpact.evidenceProvenance, "GROUND_CORROBORATED");
    assert.ok(corroboratedImpact.routeRisk.uncertaintyBand.confidence >= 0.90, "Corroborated hazard should have high confidence");
  });

  // ─── 4. A HYPOTHETICAL SCENARIO DOES NOT CHANGE THE LIVE ROUTE ───
  it("4. A hypothetical What-If scenario does NOT change the live route (Strict Simulation Isolation)", async () => {
    const liveJourneySnapshot = JSON.parse(JSON.stringify(baselineJourney));
    const originalRouteAId = liveJourneySnapshot.segments[0].candidateRoutes[0].id;
    const originalScore = liveJourneySnapshot.segments[0].candidateRoutes[0].score;

    const catastrophicParams = {
      rainfallMm: 95,
      stormDurationHours: 4.0,
      floodProbability: 95,
      temperatureC: 24,
      windSpeedKmH: 60
    };

    // Run simulation
    const simResult = await runWhatIfSimulation(baselineJourney, catastrophicParams);

    assert.strictEqual(simResult.simulationMode, true);
    assert.strictEqual(simResult.simulatedTwin.provenance, "SIMULATED");
    assert.strictEqual(simResult.simulatedTwin.simulationMode, true);

    // Deep equality check: original baselineJourney must NOT have been mutated
    assert.strictEqual(baselineJourney.segments[0].candidateRoutes[0].id, originalRouteAId);
    assert.strictEqual(baselineJourney.segments[0].candidateRoutes[0].score, originalScore);
    assert.deepStrictEqual(baselineJourney, liveJourneySnapshot, "Live journey state must remain 100% identical after simulation");
  });

  // ─── 5. MISSING WEATHER DATA DOES NOT INVENT A RISK SCORE ───
  it("5. Missing weather data does NOT invent a risk score or fabricate penalties", () => {
    // 5a. Null weather
    const nullImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: null,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(nullImpact.weatherAvailable, false);
    assert.strictEqual(nullImpact.evaluated, false);
    assert.strictEqual(nullImpact.routeRisk.riskScore, null, "Risk score must be strictly null when weather is missing");
    assert.strictEqual(nullImpact.isConfirmedHazard, false);

    // 5b. Unavailable provenance
    const unavailableWeather = normalizeWeatherData({}, "UNAVAILABLE");
    const unavailImpact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: unavailableWeather,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(unavailImpact.weatherAvailable, false);
    assert.strictEqual(unavailImpact.evaluated, false);
    assert.strictEqual(unavailImpact.routeRisk.riskScore, null, "Unavailable weather must yield null risk score");

    // 5c. Scoring Engine preserves baseline score
    const scoredWithMissing = applyWeatherEvidenceToRoute(sampleSegment.candidateRoutes[0], nullImpact);
    assert.strictEqual(scoredWithMissing.weatherEvaluation.evaluated, false);
    assert.strictEqual(scoredWithMissing.weatherEvaluation.riskScore, null);
    assert.strictEqual(scoredWithMissing.score, sampleSegment.candidateRoutes[0].score, "Route score must not be penalized when weather is missing");
  });

  // ─── 6. CONTRADICTORY WEATHER DATA HANDLING ───
  it("6. Contradictory weather data between API and ground reports triggers maximum uncertainty", () => {
    // Weather API says bone dry / 0 mm rain
    const clearWeather = normalizeWeatherData({
      current: {
        time: new Date().toISOString(),
        temperature_2m: 30.0,
        precipitation: 0.0,
        weather_code: 0
      },
      retrievalTimestamp: new Date().toISOString()
    }, "LIVE");

    // But verified ground report says severe waterlogging
    const groundContradiction = [
      {
        id: "rep-contradiction",
        segmentId: "S1",
        type: "FLOOD",
        trustShield: { actionConfidence: 0.88, impactConfidence: 0.90 }
      }
    ];

    const impact = computeSegmentWeatherImpact({
      segment: sampleSegment,
      weatherState: clearWeather,
      groundReports: groundContradiction,
      traveler: DEFAULT_TRAVELER
    });

    assert.strictEqual(impact.contradictionDetected, true);
    assert.strictEqual(impact.evidenceProvenance, "CONTRADICTION");
    assert.ok(impact.routeRisk.uncertaintyBand.confidence <= 0.40, "Confidence should drop on contradiction");
    assert.ok(impact.routeRisk.uncertaintyReason.includes("Contradiction detected"));
  });
});
